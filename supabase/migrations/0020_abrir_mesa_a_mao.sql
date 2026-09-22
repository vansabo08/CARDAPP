-- Abrir uma mesa à mão.
--
-- A sessão abre sozinha no primeiro pedido. Mas há casas onde o cliente
-- se senta, pede de viva voz, e só mais tarde alguém lança o pedido — ou
-- nunca lança. O empregado tem de poder marcar a mesa como ocupada sem
-- esperar por um pedido pelo cardápio.
--
-- Só na própria casa, só no Plano Sala (o `papel_na_casa` já o garante
-- para a equipa; para o dono, a política verifica o plano), e só a partir
-- do estado inicial: não se inventa uma sessão já com a conta pedida.
drop policy if exists sessoes_insercao_equipa on public.sessoes_mesa;
create policy sessoes_insercao_equipa on public.sessoes_mesa
  for insert to authenticated
  with check (
    estado = 'aberta'
    and public.papel_na_casa(restaurante_id) in ('dono', 'gerente', 'empregado')
    and exists (
      select 1 from public.tables t
      join public.restaurants r on r.id = t.restaurant_id
      where t.id = sessoes_mesa.mesa_id
        and t.restaurant_id = sessoes_mesa.restaurante_id
        and r.plano = 'sala'
    )
  );
