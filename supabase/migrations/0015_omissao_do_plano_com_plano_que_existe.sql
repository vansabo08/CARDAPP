-- Aplicada em produção a 2026-09-10 (20260910204844). Trazida para o
-- repositório a 2026-09-21, tal como estava na base.

-- O plano por omissão ficou no 'balcao' quando os planos passaram a ser
-- só dois. O CHECK aceitava 'mesa' e 'sala', a coluna insistia em
-- 'balcao', e como a criação de conta nunca escreve o plano, toda a
-- inscrição nova batia no CHECK e falhava.
--
-- Ficou assim durante um tempo sem ninguém dar por ela porque a única
-- casa que existe foi criada antes da mudança.
alter table public.restaurants alter column plano set default 'mesa';

-- Nenhuma linha tem de ser arranjada — o CHECK nunca deixou entrar uma
-- com o valor velho. Mas fica a conta, para o caso de haver.
update public.restaurants set plano = 'mesa' where plano not in ('mesa', 'sala');
