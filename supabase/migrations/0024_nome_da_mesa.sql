-- ---------------------------------------------------------------
-- O nome da mesa
-- ---------------------------------------------------------------
--
-- Até aqui uma mesa era um número, e o cartão dizia "Mesa 07". Numa
-- casa com esplanada, balcão e salão isso não chega: o empregado ouve
-- "a conta da sete" e tem de adivinhar se é a sete de dentro ou a sete
-- da rua. A casa passa a poder dar-lhes o nome que já usa — "Esplanada
-- 1", "Balcão", "Varanda".
--
-- O NÚMERO FICA, e continua a ser ele que manda. É o número que vai no
-- endereço do QR (`?mesa=7`), é por ele que o pedido encontra a mesa, e
-- é ele que garante que duas mesas não se confundem. O nome é uma
-- etiqueta por cima: quando existe, é o que as pessoas lêem; quando
-- está vazio, lê-se "Mesa 07" como sempre.
--
-- Por isso a coluna aceita nulo e não leva valor por omissão: as mesas
-- que já existem continuam exactamente como estavam.

alter table tables add column if not exists nome text;

comment on column tables.nome is
  'Etiqueta que a casa dá à mesa ("Esplanada 1"). Vazio = usa "Mesa <numero>".';

-- Um nome tem de caber num cartão impresso e num ecrã de telemóvel.
-- Vinte e quatro caracteres é o que cabe sem encolher a letra.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tables_nome_curto'
  ) then
    alter table tables
      add constraint tables_nome_curto
      check (nome is null or char_length(btrim(nome)) between 1 and 24);
  end if;
end $$;
