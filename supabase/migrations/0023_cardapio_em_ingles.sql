-- Plano Sala, fase 4: o cardápio em inglês.
--
-- Cada texto que o cliente lê ganha a sua versão em inglês, ao lado da
-- portuguesa. Uma coluna vazia quer dizer "sem tradução", e aí o cliente
-- lê o português — nunca um buraco.
--
-- Como nas fases anteriores, tudo soma, e o inglês é do Plano Sala: nas
-- tabelas que o Mesa também escreve (pratos e categorias), os gatilhos
-- que já guardam o que é do Sala passam a apagar também o inglês.

alter table public.items add column if not exists nome_en text check (nome_en is null or length(nome_en) <= 80);
alter table public.items add column if not exists descricao_en text check (descricao_en is null or length(descricao_en) <= 200);
alter table public.categories add column if not exists nome_en text check (nome_en is null or length(nome_en) <= 60);
alter table public.grupos_opcoes add column if not exists nome_en text check (nome_en is null or length(nome_en) <= 40);
alter table public.opcoes add column if not exists nome_en text check (nome_en is null or length(nome_en) <= 40);
alter table public.menus_horario add column if not exists nome_en text check (nome_en is null or length(nome_en) <= 40);

-- Os pratos: o que é do Sala (promoção, prato do dia e agora o inglês)
-- apaga-se numa casa Mesa.
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
    new.nome_en := null;
    new.descricao_en := null;
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

-- As categorias: o horário e o nome em inglês.
create or replace function public.horario_so_do_sala()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.casa_sala(new.restaurant_id) then
    new.menu_id := null;
    new.nome_en := null;
    return new;
  end if;

  if new.menu_id is not null and not exists (
    select 1 from menus_horario m
    where m.id = new.menu_id and m.restaurante_id = new.restaurant_id
  ) then
    new.menu_id := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.pratos_so_do_sala() from public, anon, authenticated;
revoke execute on function public.horario_so_do_sala() from public, anon, authenticated;
