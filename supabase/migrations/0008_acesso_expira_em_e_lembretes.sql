-- Aplicada em produção a 2026-09-10 (20260910102157). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- Uma data so manda no acesso.
--
-- Havia duas, `teste_termina_em` e `pago_ate`, e o estado saia da
-- comparacao das duas. Com pagamento unico a somar dias, isso deixa de
-- fazer sentido: o teste e so o primeiro credito de dias, e uma compra
-- acrescenta mais. Uma data e mais facil de explicar a alguem ao balcao.
alter table restaurants add column if not exists acesso_expira_em timestamptz;

update restaurants
set acesso_expira_em = greatest(
  coalesce(pago_ate, 'epoch'::timestamptz),
  coalesce(teste_termina_em, created_at + interval '7 days')
)
where acesso_expira_em is null;

alter table restaurants
  alter column acesso_expira_em set default (now() + interval '7 days');

create index if not exists restaurants_acesso_idx on restaurants (acesso_expira_em);

-- ------------------------------------------------------------
-- Lembretes ja enviados
--
-- O cron corre todos os dias e volta a ver as mesmas contas. Sem marca
-- do que ja foi dito, um restaurante a sete dias do fim recebia o mesmo
-- aviso todas as manhas ate pagar — e um aviso repetido deixa de se ler.
--
-- A chave inclui `ciclo_expira_em`: e a data de expiracao que estava em
-- vigor quando o aviso saiu. Assim, quando a casa paga e a data anda
-- para a frente, comeca um ciclo novo e os avisos podem voltar a sair no
-- momento certo, sem se apagar o historico do ciclo anterior.
-- ------------------------------------------------------------
create table if not exists lembretes_enviados (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references restaurants on delete cascade,
  tipo text not null,
  ciclo_expira_em timestamptz not null,
  canal text,
  enviado_em timestamptz not null default now()
);

create unique index if not exists lembretes_sem_repeticao
  on lembretes_enviados (restaurante_id, tipo, ciclo_expira_em);

create index if not exists lembretes_por_restaurante_idx
  on lembretes_enviados (restaurante_id, enviado_em desc);

-- Como os pagamentos: so o servico entra.
alter table lembretes_enviados enable row level security;
