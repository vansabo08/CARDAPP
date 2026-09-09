-- ------------------------------------------------------------
-- Pedidos dentro da aplicacao, a par do WhatsApp
--
-- O WhatsApp continua a ser o caminho por omissao: e o que a casa ja
-- sabe usar. Isto acrescenta um segundo caminho, em que o pedido fica no
-- Cardapp e o cliente acompanha o estado sem ligar a ninguem. Cada
-- restaurante escolhe qual dos dois quer, ou os dois.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Estado do pedido
--
-- Texto com restricao, e nao um enum: acrescentar um valor a um enum em
-- producao obriga a ALTER TYPE fora de transacao e nao se desfaz. Uma
-- restricao troca-se com dois comandos.
-- ------------------------------------------------------------
alter table orders add column if not exists estado text not null default 'novo';
alter table orders add column if not exists actualizado_em timestamptz not null default now();

alter table orders drop constraint if exists orders_estado_valido;
alter table orders add constraint orders_estado_valido
  check (estado in ('novo', 'preparar', 'pronto', 'caminho', 'entregue', 'cancelado'));

-- ------------------------------------------------------------
-- Como e que esta casa recebe pedidos
-- ------------------------------------------------------------
alter table restaurants add column if not exists modo_pedido text not null default 'whatsapp';

alter table restaurants drop constraint if exists restaurants_modo_pedido_valido;
alter table restaurants add constraint restaurants_modo_pedido_valido
  check (modo_pedido in ('whatsapp', 'app', 'ambos'));

-- ------------------------------------------------------------
-- O dono passa a poder mexer no estado
--
-- Havia politicas de leitura, insercao e remocao, mas nenhuma de
-- alteracao — sem isto o botao de "a preparar" falhava em silencio.
-- ------------------------------------------------------------
drop policy if exists orders_alteracao_dono on orders;
create policy orders_alteracao_dono on orders
  for update to authenticated
  using (e_meu_restaurante(restaurant_id))
  with check (e_meu_restaurante(restaurant_id));

-- ------------------------------------------------------------
-- O cliente ve o seu pedido, e so o seu
--
-- Nao ha sessao do lado do cliente, e uma politica publica de leitura
-- sobre `orders` deixaria qualquer pessoa listar os pedidos todos da
-- casa. Em vez disso, uma funcao que recebe o id e devolve uma linha:
-- o id e um uuid v4, 122 bits de entropia, que so tem quem fez o pedido.
--
-- Devolve o nome do restaurante e o numero da mesa ja resolvidos, para o
-- ecra de acompanhamento nao ter de fazer mais nenhuma pergunta.
-- ------------------------------------------------------------
create or replace function pedido_publico(pid uuid)
returns table (
  id uuid,
  estado text,
  itens jsonb,
  total numeric,
  created_at timestamptz,
  actualizado_em timestamptz,
  mesa int,
  restaurante text,
  restaurante_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.estado, o.itens, o.total, o.created_at, o.actualizado_em,
         t.numero as mesa, r.nome as restaurante, r.slug as restaurante_slug
  from orders o
  join restaurants r on r.id = o.restaurant_id
  left join tables t on t.id = o.table_id
  where o.id = pid
    and r.activo;
$$;

-- ------------------------------------------------------------
-- Indices
--
-- O painel le sempre "os pedidos desta casa, do mais recente para o mais
-- antigo, desde a meia-noite". Este indice serve essa pergunta inteira.
-- ------------------------------------------------------------
create index if not exists orders_restaurante_recentes_idx
  on orders (restaurant_id, created_at desc);

-- ------------------------------------------------------------
-- Tempo real para o painel
--
-- O dono tem sessao e ja tem politica de leitura, por isso o Realtime
-- entrega-lhe as linhas que lhe pertencem e mais nenhumas.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;
