-- Aplicada em produção a 2026-09-10 (20260910132752). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- Quando a casa foi vista pela ultima vez.
--
-- O painel bate aqui de poucos em poucos minutos enquanto alguem o tem
-- aberto. Serve duas perguntas: quem esta a usar isto agora, e ha quanto
-- tempo uma casa deixou de aparecer — que e o primeiro sinal de que se
-- vai embora, e o unico que chega a tempo de fazer alguma coisa.
alter table restaurants add column if not exists visto_em timestamptz;

create index if not exists restaurants_visto_idx on restaurants (visto_em desc nulls last);

-- ------------------------------------------------------------
-- Auditoria
--
-- Tudo o que um administrador faz a conta de outra pessoa fica escrito.
-- Nao e desconfianca: e para quando alguem perguntar "quem me mudou o
-- plano?" haver uma resposta que nao seja um encolher de ombros. Um
-- painel que mexe em contas alheias sem deixar rasto e um painel em que
-- nao se pode confiar.
--
-- Guarda-se o antes e o depois. Saber que houve uma mudanca sem saber de
-- que para que nao serve de nada.
-- ------------------------------------------------------------
create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  quem text not null,
  accao text not null,
  restaurante_id uuid references restaurants on delete set null,
  restaurante_nome text,
  antes jsonb,
  depois jsonb,
  quando timestamptz not null default now()
);

create index if not exists auditoria_recente_idx on auditoria (quando desc);
create index if not exists auditoria_por_casa_idx on auditoria (restaurante_id, quando desc);

-- Como os pagamentos: so o servico entra. E uma lista de quem mexeu em
-- que conta e quando.
alter table auditoria enable row level security;
