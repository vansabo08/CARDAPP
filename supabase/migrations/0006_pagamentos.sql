-- ------------------------------------------------------------
-- Pagamentos vindos de fora
--
-- O plano e vendido na Kursinha, que avisa o Cardapp por webhook quando
-- alguem paga. Esta tabela guarda cada aviso recebido — nao para
-- contabilidade, mas por tres razoes praticas:
--
-- 1. Idempotencia. Um webhook que nao recebe 200 e reenviado, e as
--    plataformas reenviam com gosto. Sem uma marca do que ja foi
--    processado, o mesmo pagamento dava dois meses.
--
-- 2. Depuracao. Guarda-se o corpo cru. Quando um pagamento nao abrir a
--    conta, a pergunta e sempre "o que e que eles mandaram?", e a
--    resposta tem de estar aqui e nao nos logs que ja rodaram.
--
-- 3. Rasto. Um mes de acesso dado por uma chamada HTTP tem de poder ser
--    explicado a alguem, meses depois.
-- ------------------------------------------------------------

create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants on delete set null,

  fornecedor text not null default 'kursinha',
  -- O id do evento do lado do fornecedor. E o que trava a repeticao.
  evento_id text,
  -- 'pago' abre, 'anulado' fecha, 'ignorado' fica so como rasto.
  tipo text not null,

  email text,
  plano text,
  valor numeric(12,2),
  meses int,

  -- O corpo tal e qual chegou. Nunca se le para decidir nada; existe
  -- para se poder olhar quando a decisao correu mal.
  bruto jsonb not null,
  nota text,

  criado_em timestamptz not null default now()
);

-- Dois avisos com o mesmo id do mesmo fornecedor sao o mesmo aviso.
create unique index if not exists pagamentos_evento_unico
  on pagamentos (fornecedor, evento_id)
  where evento_id is not null;

create index if not exists pagamentos_por_restaurante_idx
  on pagamentos (restaurant_id, criado_em desc);

-- ------------------------------------------------------------
-- Ninguem le isto sem ser o servidor
--
-- RLS ligada e sem politica nenhuma: nem o dono do restaurante ve os
-- seus proprios pagamentos por aqui. Quem escreve e le e a rota do
-- webhook, com a chave de servico, que passa por cima da RLS. Uma
-- tabela de pagamentos com uma politica de leitura mal desenhada e uma
-- lista de emails e valores a espera de ser encontrada.
-- ------------------------------------------------------------
alter table pagamentos enable row level security;
