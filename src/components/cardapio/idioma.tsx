'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * O cardápio do cliente em português e em inglês.
 *
 * DUAS CAMADAS:
 *
 *   - Os textos fixos do ecrã ("Ver pedido", "Juntar", "Obrigatório")
 *     vivem aqui, nas duas línguas.
 *   - Os textos da casa (pratos, categorias, opções) vêm da base, com a
 *     coluna `_en` ao lado. `em()` escolhe — e, faltando a tradução,
 *     devolve o português. Um prato sem inglês lê-se em português; nunca
 *     aparece um buraco.
 *
 * O PEDIDO FICA EM PORTUGUÊS. O que vai para a cozinha — a mensagem de
 * WhatsApp, o painel — leva sempre os nomes portugueses, os que a casa
 * escreveu. O turista lê "Chicken muamba"; a cozinha lê "Muamba de
 * Galinha", que é o que ela conhece.
 *
 * A escolha fica guardada no telemóvel. Na primeira visita, um telemóvel
 * em inglês começa em inglês; depois manda o que a pessoa escolheu.
 */

export type Idioma = 'pt' | 'en';

export const TEXTOS = {
  pt: {
    cardapio: 'Cardápio',
    mesa: 'Mesa {n}',
    categorias: 'Categorias',
    maisPedidos: 'Mais pedidos',
    aServir: 'A servir:',
    ateAs: '{menu} até às {hora}',
    pratoDoDia: 'Prato do dia',
    foraDeHorasTitulo: 'A cozinha está a descansar.',
    foraDeHorasTexto: 'Neste momento não há nada a servir. Os horários da casa:',
    desde: 'desde',
    antes: 'antes',
    esgotado: 'esgotado',
    adicionar: 'Adicionar {nome}',
    verPedido: 'Ver pedido',
    enviarPedido: 'Enviar pedido',
    enviarWhatsApp: 'Enviar pedido pelo WhatsApp',
    noPedido: '{n} no pedido',
    oSeuPedido: 'O seu pedido',
    resumo: 'Resumo do pedido',
    cada: '{preco} cada',
    obsCozinha: 'Observação para a cozinha',
    opcional: 'opcional',
    obsCozinhaAjuda: 'Alergias, pontos da carne, talheres a mais — o que for do pedido todo.',
    obsCozinhaExemplo: 'Ex.: sem cebola, pouco sal, somos alérgicos a marisco…',
    caracteres: '{n} caracteres',
    total: 'Total',
    segueApp: 'O pedido segue para o restaurante e pode acompanhá-lo aqui. O pagamento é feito na mesa.',
    segueWhatsApp: 'O pedido segue para o WhatsApp do restaurante. O pagamento é feito na mesa.',
    continuar: 'Continuar a escolher',
    obsPrato: 'Observação para este prato',
    obsPratoExemplo: 'sem cebola, bem passado, para partilhar…',
    obrigatorio: 'Obrigatório',
    opcionalTitulo: 'Opcional',
    escolhaN: 'Escolha {min}',
    escolhaNaM: 'Escolha {min} a {max}',
    ateN: 'Até {max}',
    gratis: 'grátis',
    juntar: 'Juntar',
    esgotadoBotao: 'Esgotado',
    menosUm: 'Menos um {nome}',
    maisUm: 'Mais um {nome}',
    exemplo: 'Este é o cardápio de exemplo — o pedido não chega a nenhuma cozinha.',
    falhouEnvio: 'Não conseguimos enviar o pedido. Verifique a ligação e tente outra vez.',
    erroEscolha: 'Escolha {grupo}.',
    erroMinimo: 'Escolha pelo menos {n} em {grupo}.',
    erroMaximo: 'No máximo {n} em {grupo}.',
    erroOpcao: 'Uma das opções já não existe. Volte a escolher.',
    erroOpcaoEsgotada: 'Uma opção de {grupo} esgotou. Escolha outra.',
    chamar: 'Chamar empregado',
    pedirConta: 'Pedir a conta',
    avisado: 'avisado',
    fechar: 'Fechar',
    chamarOuConta: 'Chamar o empregado ou pedir a conta',
    semLigacao: 'Sem ligação. Chame o empregado com um gesto.',
    idioma: 'Idioma do cardápio',
  },
  en: {
    cardapio: 'Menu',
    mesa: 'Table {n}',
    categorias: 'Categories',
    maisPedidos: 'Most ordered',
    aServir: 'Now serving:',
    ateAs: '{menu} until {hora}',
    pratoDoDia: "Today's special",
    foraDeHorasTitulo: 'The kitchen is resting.',
    foraDeHorasTexto: 'Nothing is being served right now. Our opening hours:',
    desde: 'from',
    antes: 'was',
    esgotado: 'sold out',
    adicionar: 'Add {nome}',
    verPedido: 'View order',
    enviarPedido: 'Send order',
    enviarWhatsApp: 'Send order via WhatsApp',
    noPedido: '{n} in your order',
    oSeuPedido: 'Your order',
    resumo: 'Order summary',
    cada: '{preco} each',
    obsCozinha: 'Note for the kitchen',
    opcional: 'optional',
    obsCozinhaAjuda: 'Allergies, how you like your meat, extra cutlery — anything about the whole order.',
    obsCozinhaExemplo: 'E.g. no onion, little salt, seafood allergy…',
    caracteres: '{n} characters left',
    total: 'Total',
    segueApp: 'Your order goes straight to the restaurant and you can follow it here. You pay at the table.',
    segueWhatsApp: "Your order goes to the restaurant's WhatsApp. You pay at the table.",
    continuar: 'Keep browsing',
    obsPrato: 'Note for this dish',
    obsPratoExemplo: 'no onion, well done, to share…',
    obrigatorio: 'Required',
    opcionalTitulo: 'Optional',
    escolhaN: 'Choose {min}',
    escolhaNaM: 'Choose {min} to {max}',
    ateN: 'Up to {max}',
    gratis: 'free',
    juntar: 'Add',
    esgotadoBotao: 'Sold out',
    menosUm: 'One less {nome}',
    maisUm: 'One more {nome}',
    exemplo: "This is the sample menu — orders don't reach any kitchen.",
    falhouEnvio: "We couldn't send your order. Check your connection and try again.",
    erroEscolha: 'Choose {grupo}.',
    erroMinimo: 'Choose at least {n} in {grupo}.',
    erroMaximo: 'At most {n} in {grupo}.',
    erroOpcao: 'One of the options is no longer available. Please choose again.',
    erroOpcaoEsgotada: 'An option in {grupo} just sold out. Please choose another.',
    chamar: 'Call the waiter',
    pedirConta: 'Ask for the bill',
    avisado: 'notified',
    fechar: 'Close',
    chamarOuConta: 'Call the waiter or ask for the bill',
    semLigacao: 'No connection. Please wave to the waiter.',
    idioma: 'Menu language',
  },
} as const satisfies Record<Idioma, Record<string, string>>;

export type Chave = keyof (typeof TEXTOS)['pt'];

/** O texto fixo na língua pedida, com as variáveis `{assim}` preenchidas. */
export function traduzir(idioma: Idioma, chave: Chave, variaveis: Record<string, string | number> = {}) {
  let texto: string = TEXTOS[idioma][chave] ?? TEXTOS.pt[chave];
  for (const [nome, valor] of Object.entries(variaveis)) texto = texto.split(`{${nome}}`).join(String(valor));
  return texto;
}

/** Os textos da casa: o inglês se houver, o português se não. */
export function em(idioma: Idioma, pt: string, en?: string | null): string;
export function em(idioma: Idioma, pt: string | null, en?: string | null): string | null;
export function em(idioma: Idioma, pt: string | null, en?: string | null) {
  if (idioma === 'en' && en && en.trim()) return en;
  return pt;
}

/** Para os testes: as duas línguas têm as mesmas chaves. */
export const CHAVES = { pt: Object.keys(TEXTOS.pt), en: Object.keys(TEXTOS.en) };

const GUARDADO = 'cardapp:idioma';

type Contexto = {
  idioma: Idioma;
  mudar: (idioma: Idioma) => void;
  t: (chave: Chave, variaveis?: Record<string, string | number>) => string;
};

const ContextoIdioma = React.createContext<Contexto>({
  idioma: 'pt',
  mudar: () => {},
  t: (chave, variaveis) => traduzir('pt', chave, variaveis),
});

/**
 * Começa sempre em português, no servidor e no primeiro desenho do
 * browser — senão os dois desenhos não batiam certo e o React deitava o
 * ecrã abaixo. Logo a seguir lê a escolha guardada (ou a língua do
 * telemóvel) e troca, se for caso disso.
 */
export function ProvedorDeIdioma({ ligado, children }: { ligado: boolean; children: React.ReactNode }) {
  const [idioma, setIdioma] = React.useState<Idioma>('pt');

  React.useEffect(() => {
    if (!ligado) return;
    let inicial: Idioma = 'pt';
    try {
      const guardado = window.localStorage.getItem(GUARDADO);
      if (guardado === 'pt' || guardado === 'en') inicial = guardado;
      else if (navigator.language?.toLowerCase().startsWith('en')) inicial = 'en';
    } catch {
      /* sem armazenamento: fica em português */
    }
    setIdioma(inicial);
  }, [ligado]);

  React.useEffect(() => {
    document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-AO';
  }, [idioma]);

  const valor = React.useMemo<Contexto>(
    () => ({
      idioma: ligado ? idioma : 'pt',
      mudar: (novo) => {
        setIdioma(novo);
        try {
          window.localStorage.setItem(GUARDADO, novo);
        } catch {
          /* fica só nesta visita */
        }
      },
      t: (chave, variaveis) => traduzir(ligado ? idioma : 'pt', chave, variaveis),
    }),
    [idioma, ligado],
  );

  return <ContextoIdioma.Provider value={valor}>{children}</ContextoIdioma.Provider>;
}

export function useIdioma() {
  return React.useContext(ContextoIdioma);
}

/** O botão PT | EN, por cima da fotografia da capa. */
export function SeletorDeIdioma({ className }: { className?: string }) {
  const { idioma, mudar, t } = useIdioma();
  return (
    <div
      role="radiogroup"
      aria-label={t('idioma')}
      className={cn('inline-flex rounded-full bg-grafite/60 p-1 backdrop-blur-sm', className)}
    >
      {(['pt', 'en'] as const).map((opcao) => (
        <button
          key={opcao}
          type="button"
          role="radio"
          aria-checked={idioma === opcao}
          lang={opcao === 'en' ? 'en' : 'pt'}
          onClick={() => mudar(opcao)}
          className={cn(
            'flex h-9 min-w-[44px] items-center justify-center rounded-full px-3 font-sans text-xs font-bold uppercase tracking-wide transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-laranja',
            idioma === opcao ? 'bg-creme text-creme' : 'text-creme/80 hover:text-creme',
          )}
        >
          {opcao === 'pt' ? 'PT' : 'EN'}
        </button>
      ))}
    </div>
  );
}
