-- Aplicada em produção a 2026-09-10 (20260910165014). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- Comprovativos de transferência.
--
-- O pagamento passa a ser à mão: a casa transfere, fotografa o
-- comprovativo, e sobe-o aqui. O acesso reabre logo, provisório, e a
-- aprovação definitiva é de quem vê o extracto do banco.
create table if not exists public.comprovativos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  plano text not null,
  valor numeric not null,

  -- O caminho dentro do balde privado, e não um URL: um URL público de
  -- um comprovativo é o extracto bancário de alguém à solta na internet.
  caminho text not null,

  -- SHA-256 do ficheiro. É o que impede o mesmo comprovativo de ser
  -- usado duas vezes — e é a fraude mais fácil de todas, porque não
  -- exige forjar nada: basta voltar a subir o do mês passado.
  impressao text not null,

  estado text not null default 'a_espera'
    check (estado in ('a_espera', 'aprovado', 'recusado')),

  -- A data de expiração que a conta tinha ANTES do acesso provisório.
  -- Sem isto, aprovar somava os 30 dias por cima dos 3 de cortesia e
  -- dava 33 por um pagamento de 30.
  expirava_em timestamptz,

  nota text,
  enviado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por text
);

-- Um comprovativo só serve uma vez, em toda a plataforma.
create unique index if not exists comprovativos_impressao_unica
  on public.comprovativos (impressao);

create index if not exists comprovativos_por_casa
  on public.comprovativos (restaurant_id, enviado_em desc);

-- A fila de quem espera decisão, que é a consulta do painel.
create index if not exists comprovativos_a_espera
  on public.comprovativos (enviado_em)
  where estado = 'a_espera';

alter table public.comprovativos enable row level security;

-- O dono vê os seus, e mais nada. Quem decide entra pela chave de
-- serviço, que passa por cima disto.
drop policy if exists "dono ve os seus comprovativos" on public.comprovativos;
create policy "dono ve os seus comprovativos"
  on public.comprovativos for select
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = comprovativos.restaurant_id and r.owner_id = auth.uid()
    )
  );

-- Não há política de INSERT de propósito: quem grava é a acção do
-- servidor, com a chave de serviço, depois de conferir o ficheiro. Se o
-- browser pudesse inserir aqui, podia inventar o valor e o estado.

-- O balde dos comprovativos é privado. Os logótipos são públicos porque
-- aparecem no cardápio; um comprovativo tem o IBAN de duas pessoas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprovativos',
  'comprovativos',
  false,
  6291456,
  array['image/jpeg','image/png','image/webp','image/avif','application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
