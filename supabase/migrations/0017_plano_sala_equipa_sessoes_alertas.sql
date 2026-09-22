-- Plano Sala, fase 1: a equipa, as sessões de mesa e os alertas.
--
-- TUDO O QUE ESTÁ AQUI SOMA. Nenhuma política existente é apagada nem
-- alterada: o dono continua a entrar pelas mesmas (`e_meu_restaurante`,
-- `owner_id = auth.uid()`), e as casas do Plano Mesa não notam nada.
-- As políticas novas abrem portas a outras pessoas — gerente, empregado,
-- cozinha —, e só em casas do Plano Sala.
--
-- O PLANO É VERIFICADO NA BASE, e não só no ecrã. Um membro de uma casa
-- que desça para o Plano Mesa perde o acesso no mesmo instante, porque
-- `papel_na_casa` deixa de lhe devolver o papel; um alerta para uma casa
-- Mesa é recusado pela função que o grava; uma sessão de mesa só abre
-- numa casa Sala.

-- ================================================================
-- 1. A equipa
-- ================================================================

-- O dono não tem linha aqui: é o `owner_id` do restaurante, como sempre
-- foi. Esta tabela guarda os outros.
create table if not exists public.membros (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurants(id) on delete cascade,
  -- Preenchido no convite: o Supabase cria o utilizador quando convida.
  user_id uuid references auth.users(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  nome text,
  papel text not null check (papel in ('gerente', 'empregado', 'cozinha')),
  convidado_por uuid references auth.users(id) on delete set null,
  convidado_em timestamptz not null default now(),
  -- Quando entrou pela primeira vez. Até lá o convite está pendente.
  aceite_em timestamptz
);

create unique index if not exists membros_email_por_casa on public.membros (restaurante_id, email);
create unique index if not exists membros_utilizador_por_casa on public.membros (restaurante_id, user_id);
create index if not exists membros_por_utilizador on public.membros (user_id);

alter table public.membros enable row level security;

-- O papel de quem pergunta, naquela casa. Nulo quer dizer "nada aqui".
--
-- `security definer` porque é chamada de dentro das políticas das
-- tabelas que ela própria lê — sem isso, ler `restaurants` para decidir
-- se se pode ler `restaurants` dava voltas sem fim.
create or replace function public.papel_na_casa(rid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from restaurants r where r.id = rid and r.owner_id = auth.uid()
    ) then 'dono'
    else (
      select m.papel
      from membros m
      join restaurants r on r.id = m.restaurante_id
      where m.restaurante_id = rid
        and m.user_id = auth.uid()
        and r.plano = 'sala'
      limit 1
    )
  end;
$$;

-- A casa e o papel de quem entrou no painel. A casa própria primeiro;
-- depois a primeira em que é membro.
create or replace function public.o_meu_papel()
returns table (restaurante_id uuid, papel text)
language sql
stable
security definer
set search_path = public
as $$
  (
    select r.id, 'dono'::text
    from restaurants r
    where r.owner_id = auth.uid()
    order by r.created_at asc
    limit 1
  )
  union all
  (
    select m.restaurante_id, m.papel
    from membros m
    join restaurants r on r.id = m.restaurante_id
    where m.user_id = auth.uid()
      and r.plano = 'sala'
      and not exists (select 1 from restaurants r2 where r2.owner_id = auth.uid())
    order by m.convidado_em asc
    limit 1
  );
$$;

revoke execute on function public.papel_na_casa(uuid) from public, anon;
grant execute on function public.papel_na_casa(uuid) to authenticated;
revoke execute on function public.o_meu_papel() from public, anon;
grant execute on function public.o_meu_papel() to authenticated;

-- Quem vê a equipa: o dono e o gerente, e cada membro a sua própria
-- linha. Escrever passa pelo servidor, que tem de falar com o sistema de
-- contas do Supabase para convidar — e confere o papel antes de o fazer.
drop policy if exists membros_leitura on public.membros;
create policy membros_leitura on public.membros
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.papel_na_casa(restaurante_id) in ('dono', 'gerente')
  );

-- ---------------------------------------------------------------
-- As portas novas, por papel
-- ---------------------------------------------------------------

-- A casa: qualquer membro a vê (a leitura pública só cobre as activas).
drop policy if exists restaurants_leitura_membro on public.restaurants;
create policy restaurants_leitura_membro on public.restaurants
  for select to authenticated
  using (public.papel_na_casa(id) in ('gerente', 'empregado', 'cozinha'));

-- O cardápio: o gerente gere.
drop policy if exists categories_gestao_gerente on public.categories;
create policy categories_gestao_gerente on public.categories
  for all to authenticated
  using (public.papel_na_casa(restaurant_id) = 'gerente')
  with check (public.papel_na_casa(restaurant_id) = 'gerente');

drop policy if exists items_gestao_gerente on public.items;
create policy items_gestao_gerente on public.items
  for all to authenticated
  using (exists (
    select 1 from public.categories c
    where c.id = items.category_id and public.papel_na_casa(c.restaurant_id) = 'gerente'
  ))
  with check (exists (
    select 1 from public.categories c
    where c.id = items.category_id and public.papel_na_casa(c.restaurant_id) = 'gerente'
  ));

-- As mesas: o gerente gere, o empregado vê.
drop policy if exists tables_gestao_gerente on public.tables;
create policy tables_gestao_gerente on public.tables
  for all to authenticated
  using (public.papel_na_casa(restaurant_id) = 'gerente')
  with check (public.papel_na_casa(restaurant_id) = 'gerente');

drop policy if exists tables_leitura_equipa on public.tables;
create policy tables_leitura_equipa on public.tables
  for select to authenticated
  using (public.papel_na_casa(restaurant_id) in ('empregado', 'cozinha'));

-- Os pedidos: toda a equipa vê e mexe no estado. A cozinha também —
-- é ela que diz que está pronto.
drop policy if exists orders_leitura_equipa on public.orders;
create policy orders_leitura_equipa on public.orders
  for select to authenticated
  using (public.papel_na_casa(restaurant_id) in ('gerente', 'empregado', 'cozinha'));

drop policy if exists orders_alteracao_equipa on public.orders;
create policy orders_alteracao_equipa on public.orders
  for update to authenticated
  using (public.papel_na_casa(restaurant_id) in ('gerente', 'empregado', 'cozinha'))
  with check (public.papel_na_casa(restaurant_id) in ('gerente', 'empregado', 'cozinha'));

-- ================================================================
-- 2. Sessões de mesa
-- ================================================================

-- Uma sessão é uma ocupação da mesa, do primeiro pedido até ao fecho.
--
--   aberta        → há gente a comer
--   conta_pedida  → pediram a conta
--   a_limpar      → a conta fechou, a mesa ainda não está pronta
--   fechada       → acabou; a mesa está livre
--
-- "Livre" não é um estado da sessão: é não haver sessão viva.
create table if not exists public.sessoes_mesa (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurants(id) on delete cascade,
  mesa_id uuid not null references public.tables(id) on delete cascade,
  estado text not null default 'aberta'
    check (estado in ('aberta', 'conta_pedida', 'a_limpar', 'fechada')),
  aberta_em timestamptz not null default now(),
  conta_pedida_em timestamptz,
  fechada_em timestamptz,
  limpa_em timestamptz,
  -- O total no momento do fecho. Os pedidos podem mudar depois (um
  -- cancelado tarde); a conta que se entregou fica como se entregou.
  total_fecho numeric(12, 2),
  fechada_por uuid references auth.users(id) on delete set null
);

-- Uma mesa não tem duas sessões vivas ao mesmo tempo.
create unique index if not exists sessoes_uma_viva_por_mesa
  on public.sessoes_mesa (mesa_id)
  where estado <> 'fechada';

create index if not exists sessoes_por_casa_estado on public.sessoes_mesa (restaurante_id, estado);
create index if not exists sessoes_por_casa_data on public.sessoes_mesa (restaurante_id, aberta_em desc);

alter table public.orders add column if not exists sessao_id uuid
  references public.sessoes_mesa(id) on delete set null;
create index if not exists orders_por_sessao on public.orders (sessao_id);

alter table public.sessoes_mesa enable row level security;

drop policy if exists sessoes_leitura_equipa on public.sessoes_mesa;
create policy sessoes_leitura_equipa on public.sessoes_mesa
  for select to authenticated
  using (public.papel_na_casa(restaurante_id) in ('dono', 'gerente', 'empregado'));

drop policy if exists sessoes_alteracao_equipa on public.sessoes_mesa;
create policy sessoes_alteracao_equipa on public.sessoes_mesa
  for update to authenticated
  using (public.papel_na_casa(restaurante_id) in ('dono', 'gerente', 'empregado'))
  with check (public.papel_na_casa(restaurante_id) in ('dono', 'gerente', 'empregado'));

-- A sessão abre sozinha no primeiro pedido.
--
-- Corre como a base e não como o cliente, porque quem faz o pedido não
-- tem sessão iniciada e não pode escrever em `sessoes_mesa`. É por isso
-- que a função confere tudo o que o cliente não pode garantir: que a mesa
-- é mesmo daquela casa, e que a casa está no Plano Sala.
create or replace function public.abrir_sessao_no_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viva_id uuid;
  viva_estado text;
  nova uuid;
begin
  if new.table_id is null then
    return new;
  end if;

  if not exists (
    select 1 from tables t
    join restaurants r on r.id = t.restaurant_id
    where t.id = new.table_id
      and t.restaurant_id = new.restaurant_id
      and r.plano = 'sala'
  ) then
    return new;
  end if;

  select id, estado into viva_id, viva_estado
  from sessoes_mesa
  where mesa_id = new.table_id and estado <> 'fechada'
  for update;

  -- Mesa a limpar e um pedido novo: sentou-se gente nova. A sessão
  -- anterior acaba e abre outra.
  if viva_estado = 'a_limpar' then
    update sessoes_mesa set estado = 'fechada', limpa_em = now() where id = viva_id;
    viva_id := null;
  end if;

  if viva_id is null then
    -- Dois pedidos da mesma mesa no mesmo instante: os dois veem a mesa
    -- sem sessão e os dois tentam abrir uma. O segundo bate no índice
    -- que só deixa haver uma viva — e junta-se à que o primeiro abriu.
    begin
      insert into sessoes_mesa (restaurante_id, mesa_id)
      values (new.restaurant_id, new.table_id)
      returning id into nova;
    exception when unique_violation then
      select id into nova
      from sessoes_mesa
      where mesa_id = new.table_id and estado <> 'fechada';
    end;
    new.sessao_id := nova;
  else
    new.sessao_id := viva_id;
  end if;

  return new;

-- O PEDIDO PASSA SEMPRE. A sessão é contabilidade da casa; o pedido é
-- comida que alguém está à espera. Se alguma coisa aqui falhar, o pedido
-- entra sem sessão e a mesa aparece livre — mau, mas nada que se compare
-- a um cliente que carregou em Enviar e cujo pedido nunca chegou.
exception when others then
  new.sessao_id := null;
  return new;
end;
$;

drop trigger if exists abrir_sessao_no_pedido on public.orders;
create trigger abrir_sessao_no_pedido
  before insert on public.orders
  for each row execute function public.abrir_sessao_no_pedido();

-- ================================================================
-- 3. Alertas: chamar o empregado, pedir a conta
-- ================================================================

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurants(id) on delete cascade,
  mesa_id uuid not null references public.tables(id) on delete cascade,
  sessao_id uuid references public.sessoes_mesa(id) on delete set null,
  tipo text not null check (tipo in ('empregado', 'conta')),
  criado_em timestamptz not null default now(),
  atendido_em timestamptz,
  atendido_por uuid references auth.users(id) on delete set null
);

create index if not exists alertas_pendentes on public.alertas (restaurante_id, criado_em desc)
  where atendido_em is null;
create index if not exists alertas_por_mesa_recentes on public.alertas (mesa_id, tipo, criado_em desc);

alter table public.alertas enable row level security;

drop policy if exists alertas_leitura_equipa on public.alertas;
create policy alertas_leitura_equipa on public.alertas
  for select to authenticated
  using (public.papel_na_casa(restaurante_id) in ('dono', 'gerente', 'empregado'));

drop policy if exists alertas_alteracao_equipa on public.alertas;
create policy alertas_alteracao_equipa on public.alertas
  for update to authenticated
  using (public.papel_na_casa(restaurante_id) in ('dono', 'gerente', 'empregado'))
  with check (public.papel_na_casa(restaurante_id) in ('dono', 'gerente', 'empregado'));

-- Não há política de inserção: o cliente chama por esta função.
--
-- Porque uma função e não um insert aberto? Por três coisas que um
-- insert não sabe fazer: confirmar que a casa é Sala, travar a repetição
-- (um alerta do mesmo tipo por mesa a cada 60 s — o dedo nervoso que
-- carrega cinco vezes não pode fazer tocar cinco vezes), e marcar a
-- sessão como "conta pedida" no mesmo passo.
--
-- A mesa vem pelo número, que é o que está no QR impresso. Um número é
-- adivinhável; é o preço de não reimprimir os cartões que já estão nas
-- mesas. O travão dos 60 s é o que impede isto de virar uma campainha
-- nas mãos de quem está do lado de fora.
create or replace function public.chamar_da_mesa(p_slug text, p_mesa int, p_tipo text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  casa_id uuid;
  casa_plano text;
  mesa_id_ uuid;
  sessao_id_ uuid;
begin
  if p_tipo not in ('empregado', 'conta') then
    return 'tipo_invalido';
  end if;

  select id, plano into casa_id, casa_plano
  from restaurants
  where slug = p_slug and activo;

  if casa_id is null then
    return 'casa_desconhecida';
  end if;

  if casa_plano <> 'sala' then
    return 'fora_do_plano';
  end if;

  select id into mesa_id_ from tables where restaurant_id = casa_id and numero = p_mesa;
  if mesa_id_ is null then
    return 'mesa_desconhecida';
  end if;

  if exists (
    select 1 from alertas
    where mesa_id = mesa_id_ and tipo = p_tipo and criado_em > now() - interval '60 seconds'
  ) then
    return 'ja_avisado';
  end if;

  select id into sessao_id_
  from sessoes_mesa
  where mesa_id = mesa_id_ and estado in ('aberta', 'conta_pedida');

  insert into alertas (restaurante_id, mesa_id, sessao_id, tipo)
  values (casa_id, mesa_id_, sessao_id_, p_tipo);

  if p_tipo = 'conta' and sessao_id_ is not null then
    update sessoes_mesa
    set estado = 'conta_pedida', conta_pedida_em = coalesce(conta_pedida_em, now())
    where id = sessao_id_;
  end if;

  return 'avisado';
end;
$$;

revoke execute on function public.chamar_da_mesa(text, int, text) from public;
grant execute on function public.chamar_da_mesa(text, int, text) to anon, authenticated;

-- ================================================================
-- 4. Tempo real
-- ================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alertas'
  ) then
    alter publication supabase_realtime add table public.alertas;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessoes_mesa'
  ) then
    alter publication supabase_realtime add table public.sessoes_mesa;
  end if;
end $$;
