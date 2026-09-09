-- ------------------------------------------------------------
-- A via do pedido e escolha da casa, nao do cliente
--
-- A 0003 abria tres hipoteses, e uma delas ('ambos') punha os dois
-- botoes a frente do cliente para ele decidir. Nao e o que se quer: quem
-- decide por onde entram os pedidos e quem os tem de atender. Dois
-- botoes tambem dividem o pedido em dois caminhos possiveis e obrigam a
-- casa a vigiar os dois.
--
-- Fica uma escolha binaria. Quem estava em 'ambos' passa para 'app', que
-- e o modo que inclui o acompanhamento — ninguem perde funcionalidade.
-- ------------------------------------------------------------

update restaurants set modo_pedido = 'app' where modo_pedido = 'ambos';

alter table restaurants drop constraint if exists restaurants_modo_pedido_valido;
alter table restaurants add constraint restaurants_modo_pedido_valido
  check (modo_pedido in ('whatsapp', 'app'));
