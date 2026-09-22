-- Plano Sala, fase 3: opções dos pratos, cardápios por horário,
-- promoções, prato do dia e o esgotado ao vivo.
--
-- Como na fase 1, tudo soma. O que já existe no Plano Mesa — o prato, o
-- preço, o interruptor "hoje há" — não muda. O que é novo só se escreve
-- numa casa Sala, e a base garante-o: as tabelas novas pela política, as
-- colunas novas de `items` e `categories` por um gatilho que as apaga
-- quando a casa não é Sala.

-- Uma casa está no Plano Sala?
create or replace function public.casa_sala(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from restaurants r where r.id = rid and r.plano = 'sala');
$$;

revoke execute on function public.casa_sala(uuid) from public;
grant execute on function public.casa_sala(uuid) to anon, authenticated;

-- ================================================================
-- 1. O esgotado: mostrar riscado ou esconder
-- ================================================================

alter table public.restaurants
  add column if not exists esgotado_modo text not null default 'mostrar';

alter table public.restaurants drop constraint if exists restaurants_esgotado_modo_valido;
alter table public.restaurants add constraint restaurants_esgotado_modo_valido
  check (esgotado_modo in ('mostrar', 'esconder'));

-- O cardápio do cliente ouve os pratos para ver o esgotado sem recarregar.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
end $$;

-- ================================================================
-- 2. Promoções e prato do dia
-- ================================================================

alter table public.items add column if not exists preco_promocional numeric(12, 2);
alter table public.items add column if not exists promo_inicio timestamptz;
alter table public.items add column if not exists promo_fim timestamptz;
alter table public.items add column if not exists prato_do_dia boolean not null default false;

alter table public.items drop constraint if exists items_promocao_valida;
alter table public.items add constraint items_promocao_valida check (
  (preco_promocional is null or (preco_promocional >= 0 and preco_promocional < preco))
  and (promo_inicio is null or promo_fim is null or promo_fim > promo_inicio)
);

create index if not exists items_prato_do_dia on public.items (category_id) where prato_do_dia;

-- ================================================================
-- 3. Cardápios por horário
-- ================================================================

-- Uma janela de serviço: "Almoço, 12:00–15:00, segunda a sexta".
-- `hora_fim` antes de `hora_inicio` quer dizer que atravessa a meia-noite
-- (um bar das 20:00 às 02:00). Os dias contam-se como no JavaScript:
-- 0 é domingo, 6 é sábado. A hora é a de Luanda — a base guarda-a sem
-- fuso, e é a aplicação que a lê em África/Luanda.
create table if not exists public.menus_horario (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurants(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 40),
  hora_inicio time not null,
  hora_fim time not null,
  dias smallint[] not null default '{0,1,2,3,4,5,6}',
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  check (hora_inicio <> hora_fim),
  check (dias <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(dias) > 0)
);

create index if not exists menus_por_casa on public.menus_horario (restaurante_id, ordem);

-- Uma categoria pode pertencer a um horário. Sem horário, está sempre.
alter table public.categories add column if not exists menu_id uuid
  references public.menus_horario(id) on delete set null;
create index if not exists categories_por_menu on public.categories (menu_id);

alter table public.menus_horario enable row level security;

drop policy if exists menus_leitura_publica on public.menus_horario;
create policy menus_leitura_publica on public.menus_horario
  for select
  using (public.restaurante_publico(restaurante_id));

drop policy if exists menus_gestao on public.menus_horario;
create policy menus_gestao on public.menus_horario
  for all to authenticated
  using (public.papel_na_casa(restaurante_id) in ('dono', 'gerente') and public.casa_sala(restaurante_id))
  with check (public.papel_na_casa(restaurante_id) in ('dono', 'gerente') and public.casa_sala(restaurante_id));

-- ================================================================
-- 4. Opções dos pratos: variantes e extras
-- ================================================================

-- Um grupo de opções de um prato.
--
--   variante → escolha única e obrigatória ("Tamanho: Pequeno / Médio /
--              Grande"). O preço de cada opção É o preço do prato nesse
--              tamanho. Há no máximo um grupo destes por prato — dois
--              preços "finais" não se somam.
--   extra    → escolha de zero a várias, com mínimo e máximo. O preço de
--              cada opção SOMA-SE ao do prato ("+ Queijo 500 Kz").
--
-- A nota livre ("sem cebola") não precisa de tabela: é a observação do
-- prato, que já existe.
create table if not exists public.grupos_opcoes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurants(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 40),
  tipo text not null check (tipo in ('variante', 'extra')),
  minimo int not null default 0,
  maximo int not null default 1,
  ordem int not null default 0,
  check (minimo >= 0 and maximo >= 1 and minimo <= maximo),
  check (tipo <> 'variante' or (minimo = 1 and maximo = 1))
);

create unique index if not exists grupos_uma_variante_por_prato
  on public.grupos_opcoes (item_id) where tipo = 'variante';
create index if not exists grupos_por_prato on public.grupos_opcoes (item_id, ordem);
create index if not exists grupos_por_casa on public.grupos_opcoes (restaurante_id);

create table if not exists public.opcoes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurants(id) on delete cascade,
  grupo_id uuid not null references public.grupos_opcoes(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 40),
  preco numeric(12, 2) not null default 0 check (preco >= 0),
  disponivel boolean not null default true,
  ordem int not null default 0
);

create index if not exists opcoes_por_grupo on public.opcoes (grupo_id, ordem);
create index if not exists opcoes_por_casa on public.opcoes (restaurante_id);

alter table public.grupos_opcoes enable row level security;
alter table public.opcoes enable row level security;

-- O cliente vê as opções das casas Sala que estão no ar.
drop policy if exists grupos_leitura_publica on public.grupos_opcoes;
create policy grupos_leitura_publica on public.grupos_opcoes
  for select
  using (public.restaurante_publico(restaurante_id) and public.casa_sala(restaurante_id));

drop policy if exists opcoes_leitura_publica on public.opcoes;
create policy opcoes_leitura_publica on public.opcoes
  for select
  using (public.restaurante_publico(restaurante_id) and public.casa_sala(restaurante_id));

drop policy if exists grupos_gestao on public.grupos_opcoes;
create policy grupos_gestao on public.grupos_opcoes
  for all to authenticated
  using (public.papel_na_casa(restaurante_id) in ('dono', 'gerente') and public.casa_sala(restaurante_id))
  with check (public.papel_na_casa(restaurante_id) in ('dono', 'gerente') and public.casa_sala(restaurante_id));

drop policy if exists opcoes_gestao on public.opcoes;
create policy opcoes_gestao on public.opcoes
  for all to authenticated
  using (public.papel_na_casa(restaurante_id) in ('dono', 'gerente') and public.casa_sala(restaurante_id))
  with check (public.papel_na_casa(restaurante_id) in ('dono', 'gerente') and public.casa_sala(restaurante_id));

-- A casa de um grupo é a do prato, e a de uma opção é a do grupo.
--
-- Não se confia no que vem do browser: o gatilho escreve a casa a partir
-- do prato, antes de a política a conferir (a RLS confere depois dos
-- gatilhos BEFORE). Um grupo pendurado num prato de outra casa fica com
-- a casa desse prato — e a política recusa-o.
create or replace function public.opcoes_herdam_a_casa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'grupos_opcoes' then
    select c.restaurant_id into new.restaurante_id
    from items i join categories c on c.id = i.category_id
    where i.id = new.item_id;
  else
    select g.restaurante_id into new.restaurante_id
    from grupos_opcoes g where g.id = new.grupo_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.opcoes_herdam_a_casa() from public, anon, authenticated;

drop trigger if exists grupos_herdam_a_casa on public.grupos_opcoes;
create trigger grupos_herdam_a_casa
  before insert or update on public.grupos_opcoes
  for each row execute function public.opcoes_herdam_a_casa();

drop trigger if exists opcoes_herdam_a_casa on public.opcoes;
create trigger opcoes_herdam_a_casa
  before insert or update on public.opcoes
  for each row execute function public.opcoes_herdam_a_casa();

-- ================================================================
-- 5. O que é do Sala nas tabelas de sempre
-- ================================================================

-- Promoção, prato do dia e horário da categoria vivem em tabelas que o
-- Plano Mesa também escreve. A política deixa o dono escrever o prato
-- inteiro — por isso é um gatilho que apaga estes campos quando a casa
-- não é Sala. E é ele que garante um prato do dia só por casa.
create or replace function public.pratos_so_do_sala()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  casa uuid;
  sala boolean;
begin
  select c.restaurant_id into casa from categories c where c.id = new.category_id;
  sala := public.casa_sala(casa);

  if not sala then
    new.preco_promocional := null;
    new.promo_inicio := null;
    new.promo_fim := null;
    new.prato_do_dia := false;
    return new;
  end if;

  if new.prato_do_dia and (tg_op = 'INSERT' or not coalesce(old.prato_do_dia, false)) then
    update items set prato_do_dia = false
    where prato_do_dia
      and id <> new.id
      and category_id in (select id from categories where restaurant_id = casa);
  end if;

  return new;
end;
$$;

revoke execute on function public.pratos_so_do_sala() from public, anon, authenticated;

drop trigger if exists pratos_so_do_sala on public.items;
create trigger pratos_so_do_sala
  before insert or update on public.items
  for each row execute function public.pratos_so_do_sala();

create or replace function public.horario_so_do_sala()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.menu_id is not null and (
    not public.casa_sala(new.restaurant_id)
    or not exists (
      select 1 from menus_horario m
      where m.id = new.menu_id and m.restaurante_id = new.restaurant_id
    )
  ) then
    new.menu_id := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.horario_so_do_sala() from public, anon, authenticated;

drop trigger if exists horario_so_do_sala on public.categories;
create trigger horario_so_do_sala
  before insert or update on public.categories
  for each row execute function public.horario_so_do_sala();
