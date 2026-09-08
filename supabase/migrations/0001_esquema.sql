-- ============================================================
-- Cardapp — esquema inicial
-- Correr no SQL Editor do Supabase (uma vez).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  nome text not null,
  slug text unique not null,
  logo_url text,
  whatsapp text not null,          -- formato 244XXXXXXXXX
  cor_marca text default '#D9B36B',
  plano text default 'balcao',     -- balcao | mesa | sala
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants on delete cascade,
  numero int not null,
  qr_token text unique not null,
  unique (restaurant_id, numero)
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants on delete cascade,
  nome text not null,
  ordem int default 0
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(12,2) not null,
  foto_url text,
  disponivel boolean default true,
  ordem int default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants on delete cascade,
  table_id uuid references tables,
  itens jsonb not null,            -- [{nome, qtd, preco, obs}]
  total numeric(12,2) not null,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Indices — o cardapio publico e lido a cada scan, tem de voar
-- ------------------------------------------------------------

create index if not exists restaurants_owner_idx on restaurants (owner_id);
create index if not exists restaurants_slug_activo_idx on restaurants (slug) where activo;
create index if not exists tables_restaurant_idx on tables (restaurant_id, numero);
create index if not exists categories_restaurant_idx on categories (restaurant_id, ordem);
create index if not exists items_category_idx on items (category_id, ordem);
create index if not exists orders_restaurant_data_idx on orders (restaurant_id, created_at desc);

-- ------------------------------------------------------------
-- Restricoes de dominio
-- ------------------------------------------------------------

do $$ begin
  alter table restaurants add constraint restaurants_plano_valido
    check (plano in ('balcao', 'mesa', 'sala'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table restaurants add constraint restaurants_whatsapp_formato
    check (whatsapp ~ '^244[0-9]{9}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table restaurants add constraint restaurants_slug_formato
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table items add constraint items_preco_nao_negativo check (preco >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table tables add constraint tables_numero_positivo check (numero > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table orders add constraint orders_total_nao_negativo check (total >= 0);
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Funcoes auxiliares
-- Marcadas security definer para poderem consultar a tabela de
-- restaurantes sem entrar em recursao infinita nas politicas.
-- ------------------------------------------------------------

create or replace function e_meu_restaurante(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from restaurants r
    where r.id = rid and r.owner_id = auth.uid()
  );
$$;

create or replace function restaurante_publico(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from restaurants r
    where r.id = rid and r.activo
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- Regra geral: o dono le e escreve as linhas do seu restaurante.
-- O publico (anon) le restaurantes activos, as suas categorias,
-- pratos e mesas. O publico pode inserir pedidos e mais nada.
-- ------------------------------------------------------------

alter table restaurants enable row level security;
alter table tables enable row level security;
alter table categories enable row level security;
alter table items enable row level security;
alter table orders enable row level security;

-- restaurants ------------------------------------------------

drop policy if exists restaurants_leitura_publica on restaurants;
create policy restaurants_leitura_publica on restaurants
  for select using (activo);

drop policy if exists restaurants_leitura_dono on restaurants;
create policy restaurants_leitura_dono on restaurants
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists restaurants_insercao_dono on restaurants;
create policy restaurants_insercao_dono on restaurants
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists restaurants_alteracao_dono on restaurants;
create policy restaurants_alteracao_dono on restaurants
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists restaurants_remocao_dono on restaurants;
create policy restaurants_remocao_dono on restaurants
  for delete to authenticated using (owner_id = auth.uid());

-- tables -----------------------------------------------------

drop policy if exists tables_leitura_publica on tables;
create policy tables_leitura_publica on tables
  for select using (restaurante_publico(restaurant_id));

drop policy if exists tables_gestao_dono on tables;
create policy tables_gestao_dono on tables
  for all to authenticated
  using (e_meu_restaurante(restaurant_id))
  with check (e_meu_restaurante(restaurant_id));

-- categories -------------------------------------------------

drop policy if exists categories_leitura_publica on categories;
create policy categories_leitura_publica on categories
  for select using (restaurante_publico(restaurant_id));

drop policy if exists categories_gestao_dono on categories;
create policy categories_gestao_dono on categories
  for all to authenticated
  using (e_meu_restaurante(restaurant_id))
  with check (e_meu_restaurante(restaurant_id));

-- items ------------------------------------------------------

drop policy if exists items_leitura_publica on items;
create policy items_leitura_publica on items
  for select using (
    exists (
      select 1 from categories c
      where c.id = items.category_id and restaurante_publico(c.restaurant_id)
    )
  );

drop policy if exists items_gestao_dono on items;
create policy items_gestao_dono on items
  for all to authenticated
  using (
    exists (
      select 1 from categories c
      where c.id = items.category_id and e_meu_restaurante(c.restaurant_id)
    )
  )
  with check (
    exists (
      select 1 from categories c
      where c.id = items.category_id and e_meu_restaurante(c.restaurant_id)
    )
  );

-- orders -----------------------------------------------------
-- O cliente nao tem conta: pode inserir num restaurante activo,
-- mas nunca ler os pedidos de ninguem.

drop policy if exists orders_insercao_publica on orders;
create policy orders_insercao_publica on orders
  for insert with check (restaurante_publico(restaurant_id));

drop policy if exists orders_leitura_dono on orders;
create policy orders_leitura_dono on orders
  for select to authenticated using (e_meu_restaurante(restaurant_id));

drop policy if exists orders_remocao_dono on orders;
create policy orders_remocao_dono on orders
  for delete to authenticated using (e_meu_restaurante(restaurant_id));

-- ------------------------------------------------------------
-- Storage — logos dos restaurantes e fotos dos pratos
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('cardapp', 'cardapp', true)
on conflict (id) do nothing;

drop policy if exists cardapp_leitura_publica on storage.objects;
create policy cardapp_leitura_publica on storage.objects
  for select using (bucket_id = 'cardapp');

-- Cada dono escreve apenas dentro da sua propria pasta: <uid>/...
drop policy if exists cardapp_escrita_dono on storage.objects;
create policy cardapp_escrita_dono on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cardapp'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists cardapp_alteracao_dono on storage.objects;
create policy cardapp_alteracao_dono on storage.objects
  for update to authenticated
  using (bucket_id = 'cardapp' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cardapp_remocao_dono on storage.objects;
create policy cardapp_remocao_dono on storage.objects
  for delete to authenticated
  using (bucket_id = 'cardapp' and (storage.foldername(name))[1] = auth.uid()::text);
