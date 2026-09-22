-- Aplicada em produção a 2026-09-10 (20260910103159). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- As contas activas com o email do dono ao lado.
--
-- O cron precisa do email para avisar, e ele vive em `auth.users`, que
-- o PostgREST nao expoe. Uma funcao `security definer` resolve a juncao
-- de uma vez, em vez de o cron pedir os utilizadores todos e cruzar em
-- memoria.
--
-- Fechada a toda a gente menos ao servico: e uma lista de emails.
create or replace function contas_com_email()
returns table (
  id uuid,
  nome text,
  slug text,
  plano text,
  whatsapp text,
  email text,
  acesso_expira_em timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select r.id, r.nome, r.slug, r.plano, r.whatsapp, u.email::text, r.acesso_expira_em
  from restaurants r
  join auth.users u on u.id = r.owner_id
  where r.activo
    and r.acesso_expira_em is not null;
$$;

revoke execute on function contas_com_email() from public;
revoke execute on function contas_com_email() from anon;
revoke execute on function contas_com_email() from authenticated;
grant execute on function contas_com_email() to service_role;
