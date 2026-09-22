-- Aplicada em produção a 2026-09-10 (20260910131319). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- Observacao do pedido inteiro, escrita pelo cliente antes de enviar.
--
-- Ja havia observacao por prato ("sem cebola" naquele prato). Faltava a
-- do pedido todo: "sem cebola em nada", "somos alergicos a amendoim",
-- "levem talheres a mais". Sao coisas que nao pertencem a nenhum prato
-- em particular e que, sem sitio para as escrever, acabavam a ser ditas
-- em voz alta a quem passasse — ou nao eram ditas de todo.
alter table orders add column if not exists observacao text;

-- Quando alguem da casa viu o pedido.
--
-- E o que cala o alarme. Ate agora o alarme so parava quando o pedido
-- saia de 'novo', o que obrigava a decidir o estado antes de o poder
-- calar. Confirmar que se viu e mais rapido do que decidir o que fazer,
-- e e isso que a cozinha precisa de fazer primeiro.
alter table orders add column if not exists confirmado_em timestamptz;

-- Os pedidos que ja passaram de 'novo' contam como vistos: ninguem os
-- move sem os ter visto.
update orders set confirmado_em = coalesce(actualizado_em, created_at)
where estado <> 'novo' and confirmado_em is null;

create index if not exists orders_por_confirmar_idx
  on orders (restaurant_id, created_at desc)
  where confirmado_em is null;
