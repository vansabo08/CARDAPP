-- Os convites da equipa.

-- Quem já tem conta.
--
-- Convidar alguém que já tem conta no CardApp — o dono de outra casa, ou
-- um empregado que trabalha em duas — faz o Supabase recusar o convite,
-- porque o utilizador já existe. Nesse caso liga-se a pessoa à equipa
-- pela conta que já tem. O email vive em `auth.users`, que o PostgREST
-- não mostra, e por isso isto é uma função — fechada a toda a gente
-- menos ao servidor, porque diz se um email tem conta ou não.
create or replace function public.utilizador_por_email(e text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id from auth.users u where lower(u.email) = lower(trim(e)) limit 1;
$$;

revoke execute on function public.utilizador_por_email(text) from public, anon, authenticated;
grant execute on function public.utilizador_por_email(text) to service_role;

-- O convidado entrou.
--
-- Marca a primeira entrada de quem foi convidado, para o dono ver na
-- lista quem já aceitou. Só toca nas linhas de quem chama.
create or replace function public.aceitar_convites()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update membros set aceite_em = now()
  where user_id = auth.uid() and aceite_em is null;
$$;

revoke execute on function public.aceitar_convites() from public, anon;
grant execute on function public.aceitar_convites() to authenticated;
