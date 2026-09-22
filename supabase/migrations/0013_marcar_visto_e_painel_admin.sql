-- Aplicada em produção a 2026-09-10 (20260910132820). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- O dono marca que esteve aqui.
--
-- `security definer` porque a politica de alteracao do restaurante
-- obriga a passar por `e_meu_restaurante`, e isto e uma escrita minuscula
-- que nao tem de carregar essa verificacao a cada batida. A funcao so
-- toca na linha de quem chama, e nao aceita id nenhum de fora — o
-- `auth.uid()` decide.
create or replace function marcar_visto()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update restaurants set visto_em = now() where owner_id = auth.uid();
$$;

revoke execute on function marcar_visto() from public;
revoke execute on function marcar_visto() from anon;
grant execute on function marcar_visto() to authenticated;

-- ------------------------------------------------------------
-- Os numeros do painel de administracao, calculados na base
--
-- Uma serie de trinta dias montada em JavaScript obrigava a trazer os
-- pedidos todos para memoria so para os contar por dia. Aqui a base faz
-- a contagem e devolve trinta linhas.
-- ------------------------------------------------------------
create or replace function pedidos_por_dia(dias int default 30)
returns table (dia date, total bigint, valor numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    d::date as dia,
    count(o.id) as total,
    coalesce(sum(o.total), 0) as valor
  from generate_series(
    (now() at time zone 'Africa/Luanda')::date - (dias - 1),
    (now() at time zone 'Africa/Luanda')::date,
    interval '1 day'
  ) d
  left join orders o
    on (o.created_at at time zone 'Africa/Luanda')::date = d::date
  group by d
  order by d;
$$;

revoke execute on function pedidos_por_dia(int) from public;
revoke execute on function pedidos_por_dia(int) from anon;
revoke execute on function pedidos_por_dia(int) from authenticated;
grant execute on function pedidos_por_dia(int) to service_role;
