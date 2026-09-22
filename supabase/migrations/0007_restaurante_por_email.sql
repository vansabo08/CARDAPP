-- Aplicada em produção a 2026-09-10 (20260910090827). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.
create or replace function restaurante_por_email(e text)
returns table (id uuid, plano text, pago_ate timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select r.id, r.plano, r.pago_ate
  from restaurants r
  join auth.users u on u.id = r.owner_id
  where lower(u.email) = lower(trim(e))
  order by r.created_at asc
  limit 1;
$$;

revoke execute on function restaurante_por_email(text) from public;
revoke execute on function restaurante_por_email(text) from anon;
revoke execute on function restaurante_por_email(text) from authenticated;
grant execute on function restaurante_por_email(text) to service_role;
