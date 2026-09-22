-- Sessões esquecidas.
--
-- A sessão abre sozinha no primeiro pedido, mas só fecha quando alguém
-- carrega em "Fechar conta" no salão. Uma casa que não usa o salão — ou
-- um dia em que ninguém se lembrou — deixava a mesa aberta para sempre, e
-- o jantar das oito juntava-se à conta do almoço da uma.
--
-- Por isso: uma mesa sem pedido nenhum há mais de QUATRO HORAS conta como
-- esquecida. O pedido seguinte fecha-a e abre uma sessão nova. Quatro
-- horas cobrem o almoço mais comprido que há; não cobrem um almoço e um
-- jantar.
--
-- O salão usa a mesma regra para mostrar a mesa como livre
-- (`HORAS_ATE_ESQUECER`, em src/lib/salao.ts).
create or replace function public.abrir_sessao_no_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viva_id uuid;
  viva_estado text;
  viva_aberta timestamptz;
  ultima timestamptz;
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

  select id, estado, aberta_em into viva_id, viva_estado, viva_aberta
  from sessoes_mesa
  where mesa_id = new.table_id and estado <> 'fechada'
  for update;

  if viva_id is not null then
    select max(created_at) into ultima from orders where sessao_id = viva_id;

    -- Mesa a limpar e um pedido novo: sentou-se gente nova.
    -- Mesa esquecida há mais de quatro horas: também.
    if viva_estado = 'a_limpar'
       or coalesce(ultima, viva_aberta) < now() - interval '4 hours' then
      update sessoes_mesa
      set estado = 'fechada',
          limpa_em = coalesce(limpa_em, now()),
          fechada_em = coalesce(fechada_em, now())
      where id = viva_id;
      viva_id := null;
    end if;
  end if;

  if viva_id is null then
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

exception when others then
  new.sessao_id := null;
  return new;
end;
$$;

revoke execute on function public.abrir_sessao_no_pedido() from public, anon, authenticated;
