import { Revelar } from '@/components/ui/revelar';

/**
 * Prova social.
 *
 * Os textos e os nomes são marcadores por preencher, de propósito e à
 * vista: um testemunho inventado que pareça verdadeiro é uma mentira
 * publicada, e o custo de a deixar passar é maior do que o de a secção
 * ficar por acabar. Substituir por depoimentos reais, com autorização.
 */

type Testemunho = {
  citacao: string;
  nome: string;
  restaurante: string;
  cidade: string;
  iniciais: string;
};

const TESTEMUNHOS: Testemunho[] = [
  {
    citacao:
      '[TODO — citação por recolher. Duas ou três linhas, na voz do próprio, sobre o que mudou na sala depois do Cardapp.]',
    nome: '[TODO — nome]',
    restaurante: '[TODO — restaurante]',
    cidade: 'Luanda',
    iniciais: '—',
  },
  {
    citacao:
      '[TODO — citação por recolher. De preferência com um número concreto: tempo de atendimento, erros de pedido, mesas por turno.]',
    nome: '[TODO — nome]',
    restaurante: '[TODO — restaurante]',
    cidade: 'Benguela',
    iniciais: '—',
  },
  {
    citacao:
      '[TODO — citação por recolher. Vale a pena uma de quem tinha dúvidas no início e mudou de ideias.]',
    nome: '[TODO — nome]',
    restaurante: '[TODO — restaurante]',
    cidade: 'Lobito',
    iniciais: '—',
  },
];

/** [TODO] Substituir pelos nomes reais das casas que aceitarem aparecer. */
const CASAS = ['[TODO — casa 1]', '[TODO — casa 2]', '[TODO — casa 3]', '[TODO — casa 4]', '[TODO — casa 5]'];

export function ProvaSocial() {
  return (
    <section className="border-t border-linha">
      <div className="mx-auto max-w-conteudo px-5 py-24 md:px-8 md:py-28">
        <Revelar>
          <span className="etiqueta text-ouro-fundo">Quem já usa</span>
          <h2 className="mt-5 max-w-[18ch] font-display text-[34px] leading-[1.08] text-creme md:text-[44px]">
            Salas cheias, pedidos sem enganos.
          </h2>
        </Revelar>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {TESTEMUNHOS.map((t, i) => (
            <Revelar key={i} atraso={i * 70}>
              <figure className="flex h-full flex-col">
                <blockquote className="flex-1 font-display text-[21px] leading-[1.42] text-creme/85 md:text-[22px]">
                  {t.citacao}
                </blockquote>

                <figcaption className="mt-7 flex items-center gap-3 border-t border-linha pt-6">
                  {/* [TODO] Trocar as iniciais por fotografia redonda de 40px. */}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-linha font-display text-[15px] text-tenue">
                    {t.iniciais}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-[14px] font-semibold text-creme">
                      {t.nome}
                    </span>
                    <span className="block truncate font-sans text-[13px] text-tenue">
                      {t.restaurante} · {t.cidade}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Revelar>
          ))}
        </div>

        <Revelar atraso={220}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-linha pt-10">
            {CASAS.map((casa) => (
              <span
                key={casa}
                className="font-display text-[17px] text-creme/25 transition-colors duration-300 hover:text-creme/40"
              >
                {casa}
              </span>
            ))}
          </div>
        </Revelar>
      </div>
    </section>
  );
}
