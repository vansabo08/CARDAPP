-- Aplicada em produção a 2026-09-10 (20260910225530). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- Casas que nunca pagam.
--
-- A casa de quem é dono disto não se cobra a si próprio, e uma casa de
-- demonstração também não. Sem uma forma de o dizer, a alternativa era
-- ir empurrando a data de expiração para a frente de mês a mês — e no
-- mês em que alguém se esquecesse, a casa fechava.
alter table public.restaurants
  add column if not exists isento boolean not null default false;

comment on column public.restaurants.isento is
  'Casa que nunca é cobrada. Força acesso_expira_em a nulo, e nulo já significa activa para sempre em toda a aplicação.';

-- A ISENÇÃO É DECLARADA AQUI E GARANTIDA PELA BASE.
--
-- `acesso_expira_em` a nulo já quer dizer "sem prazo" em todo o código:
-- o estado dá activa, o cardápio fica no ar, e nenhum lembrete sai. Em
-- vez de espalhar `if (isento)` por onze sítios — e esquecer um —, a
-- base apaga a data sempre que a linha é isenta.
--
-- Assim nada mais precisa de saber que isto existe: nem o painel, nem o
-- cron, nem o cardápio público. E um pagamento que entrasse por engano
-- numa casa isenta não a punha a pagar, porque a data volta a nulo.
create or replace function public.isencao_apaga_o_prazo()
returns trigger
language plpgsql
as $$
begin
  if new.isento then
    new.acesso_expira_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists isencao_apaga_o_prazo on public.restaurants;
create trigger isencao_apaga_o_prazo
  before insert or update on public.restaurants
  for each row execute function public.isencao_apaga_o_prazo();

-- A casa do dono.
update public.restaurants r
set isento = true
from auth.users u
where u.id = r.owner_id and lower(u.email) = 'vansabo08@gmail.com';
