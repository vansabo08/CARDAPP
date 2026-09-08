-- ============================================================
-- Cardapp — fotografia de capa do cardápio
-- Correr no SQL Editor do Supabase, depois do 0001.
-- ============================================================

-- Até aqui o herói do cardápio usava a primeira fotografia de prato que
-- encontrasse. Serve para arrancar, mas é acidental: mudava sozinho
-- quando o restaurante reordenava os pratos. Agora é escolha do dono.
alter table restaurants add column if not exists capa_url text;

comment on column restaurants.capa_url is
  'Fotografia larga do topo do cardápio público. Sem ela, cai na primeira foto de prato.';
