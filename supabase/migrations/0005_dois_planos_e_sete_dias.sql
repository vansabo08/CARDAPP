-- ------------------------------------------------------------
-- Dois planos, e sete dias para experimentar
--
-- Sai o plano Balcao, que era gratuito para sempre. Ficam Mesa e Sala,
-- ambos pagos, e ambos com sete dias livres a contar da criacao da
-- conta. Quem estava em Balcao passa para Mesa: e o plano de entrada
-- agora, e ninguem deve perder o que ja tinha por causa de uma mudanca
-- de tabela de precos.
-- ------------------------------------------------------------

update restaurants set plano = 'mesa' where plano = 'balcao';

alter table restaurants drop constraint if exists restaurants_plano_valido;
alter table restaurants add constraint restaurants_plano_valido
  check (plano in ('mesa', 'sala'));

-- ------------------------------------------------------------
-- Quando acaba o teste, e ate quando esta pago
--
-- Duas datas em vez de um estado: um estado tem de ser corrigido por
-- alguem a cada mudanca, e uma data corrige-se sozinha com a passagem
-- do tempo. `pago_ate` no futuro manda sobre tudo; sem ele vale o
-- `teste_termina_em`; passados os dois, a conta esta expirada.
--
-- Enquanto o pagamento por Multicaixa Express e AppyPay nao estiver
-- ligado, o `pago_ate` e estendido a mao pelo painel de administracao.
-- ------------------------------------------------------------
alter table restaurants add column if not exists teste_termina_em timestamptz;
alter table restaurants add column if not exists pago_ate timestamptz;

-- Quem ja ca estava nao comeca o teste hoje do zero nem fica expirado
-- de um dia para o outro: conta-se a partir da criacao da conta, e a
-- quem ja passou dos sete dias dao-se sete dias a partir de agora, que
-- e o que se faria a um cliente numa conversa.
update restaurants
set teste_termina_em = greatest(created_at + interval '7 days', now() + interval '7 days')
where teste_termina_em is null;

alter table restaurants alter column teste_termina_em set default (now() + interval '7 days');

create index if not exists restaurants_fim_do_teste_idx
  on restaurants (teste_termina_em)
  where pago_ate is null;
