'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Botao } from '@/components/ui/botao';
import { Ajuda, Campo, Erro, Rotulo } from '@/components/ui/campo';
import { Marca } from '@/components/marca';
import { FundoVivo } from '@/components/marketing/fundo-vivo';
import {
  CampoWhatsApp,
  CamposIdentidade,
  type ValoresRestaurante,
} from '@/components/painel/formulario-restaurante';
import { formatarKz, whatsAppValido } from '@/lib/format';
import { slugify } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { criarRestaurante, type CategoriaInicial } from '@/app/painel/definicoes/accoes';

const PASSOS = ['O restaurante', 'As mesas', 'O cardápio', 'O WhatsApp'];

const SUGESTAO: CategoriaInicial[] = [
  {
    nome: 'Entradas',
    itens: [{ nome: 'Kitaba', preco: 1800, descricao: 'Pasta de amendoim com piripiri' }],
  },
  {
    nome: 'Pratos Principais',
    itens: [
      { nome: 'Muamba de Galinha', preco: 4500, descricao: 'Óleo de palma, quiabo e funge' },
      { nome: 'Calulu de Peixe', preco: 5500, descricao: 'Folhas de batata-doce' },
      { nome: 'Funge de Bombó', preco: 1500, descricao: null },
    ],
  },
  {
    nome: 'Grelhados',
    itens: [{ nome: 'Mufete', preco: 7500, descricao: 'Carapau grelhado e banana pão' }],
  },
  {
    nome: 'Bebidas',
    itens: [
      { nome: 'Cuca 33cl', preco: 600, descricao: null },
      { nome: 'Blue 33cl', preco: 700, descricao: null },
    ],
  },
];

export function Onboarding({ demonstracao }: { demonstracao: boolean }) {
  const router = useRouter();
  const [passo, setPasso] = React.useState(0);
  const [erro, setErro] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);

  const [identidade, setIdentidade] = React.useState<ValoresRestaurante>({
    nome: '',
    slug: '',
    whatsapp: '',
    logo_url: null,
    capa_url: null,
    cor_marca: '#D9B36B',
    // Quem comeca comeca pelo WhatsApp, que e o que ja sabe usar.
    modo_pedido: 'whatsapp',
  });
  const [mesas, setMesas] = React.useState('8');
  const [cardapio, setCardapio] = React.useState<CategoriaInicial[]>(SUGESTAO);

  const podeAvancar = [
    identidade.nome.trim().length >= 2 && Boolean(slugify(identidade.slug || identidade.nome)),
    (Number.parseInt(mesas, 10) || 0) >= 1,
    cardapio.some((c) => c.itens.some((i) => i.nome.trim())),
    whatsAppValido(identidade.whatsapp),
  ][passo];

  async function concluir() {
    setOcupado(true);
    setErro(null);

    const resultado = await criarRestaurante(
      { ...identidade, slug: slugify(identidade.slug || identidade.nome) },
      Number.parseInt(mesas, 10) || 1,
      cardapio,
    );

    setOcupado(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Não foi possível concluir.');
      return;
    }

    router.push('/painel/mesas');
    router.refresh();
  }

  return (
    <div className="relative min-h-dvh">
      <FundoVivo />
      <header className="border-b border-linha px-5 py-5 md:px-8">
        <Marca href="/painel" />
      </header>

      <main className="mx-auto max-w-[560px] px-5 py-12 md:py-16">
        {/* progresso */}
        <ol className="flex items-center gap-2" aria-label="Passos">
          {PASSOS.map((nome, i) => (
            <li key={nome} className="flex flex-1 flex-col gap-2">
              <span
                className={cn(
                  'block h-[3px] rounded-full transition-colors duration-[240ms]',
                  i <= passo ? 'bg-ouro' : 'bg-white/[0.09]',
                )}
              />
              <span
                className={cn(
                  'etiqueta hidden sm:block',
                  i === passo ? 'text-ouro' : 'text-tenue',
                )}
              >
                {nome}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-9 etiqueta text-tenue">
          Passo {passo + 1} de {PASSOS.length}
        </p>

        <div key={passo} className="mt-4 animate-subir">
          {passo === 0 ? (
            <>
              <h1 className="font-display text-3xl leading-tight text-creme">
                Como se chama a casa?
              </h1>
              <p className="mt-3 font-sans text-sm leading-normal text-tenue">
                O endereço do cardápio é escrito a partir do nome — pode mudá-lo se quiser.
              </p>
              <div className="mt-8">
                <CamposIdentidade
                  valores={identidade}
                  aoMudar={(p) => setIdentidade((v) => ({ ...v, ...p }))}
                  slugAutomatico
                />
              </div>
            </>
          ) : null}

          {passo === 1 ? (
            <>
              <h1 className="font-display text-3xl leading-tight text-creme">
                Quantas mesas tem a sala?
              </h1>
              <p className="mt-3 font-sans text-sm leading-normal text-tenue">
                Criamos um QR para cada uma, numerado de 1 até ao número que indicar. Depois pode
                juntar mais.
              </p>

              <div className="mt-8 max-w-[220px]">
                <Rotulo htmlFor="mesas">Número de mesas</Rotulo>
                <Campo
                  id="mesas"
                  inputMode="numeric"
                  value={mesas}
                  onChange={(e) => setMesas(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="text-center font-sans text-xl font-bold"
                />
                <Ajuda>Entre 1 e 80.</Ajuda>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {[4, 8, 12, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMesas(String(n))}
                    className={cn(
                      'rounded-full border px-4 py-1.5 font-sans text-xs font-semibold transition-colors duration-200',
                      mesas === String(n)
                        ? 'border-ouro bg-ouro/10 text-ouro'
                        : 'border-linha text-tenue hover:text-creme',
                    )}
                  >
                    {n} mesas
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {passo === 2 ? (
            <>
              <h1 className="font-display text-3xl leading-tight text-creme">
                O que serve a cozinha?
              </h1>
              <p className="mt-3 font-sans text-sm leading-normal text-tenue">
                Deixámos uma sugestão para não começar em branco. Mude o que quiser — o resto
                acrescenta-se depois no painel.
              </p>
              <div className="mt-8">
                <EditorCardapioInicial cardapio={cardapio} aoMudar={setCardapio} />
              </div>
            </>
          ) : null}

          {passo === 3 ? (
            <>
              <h1 className="font-display text-3xl leading-tight text-creme">
                Para onde vão os pedidos?
              </h1>
              <p className="mt-3 font-sans text-sm leading-normal text-tenue">
                Cada pedido chega como mensagem de WhatsApp a este número, já escrito e somado.
              </p>
              <div className="mt-8">
                <CampoWhatsApp
                  valor={identidade.whatsapp}
                  aoMudar={(v) => setIdentidade((x) => ({ ...x, whatsapp: v }))}
                />
              </div>

              {demonstracao ? (
                <p className="mt-7 rounded-cartao border border-ouro/30 bg-ouro/[0.06] px-4 py-3 font-sans text-xs leading-normal text-ouro">
                  Sem Supabase ligado nada fica gravado — mas pode percorrer o painel todo à mesma.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {erro ? <Erro>{erro}</Erro> : null}

        <div className="mt-10 flex items-center gap-3 border-t border-linha pt-7">
          {passo > 0 ? (
            <Botao variante="discreto" tamanho="md" onClick={() => setPasso((p) => p - 1)}>
              Voltar
            </Botao>
          ) : null}

          <div className="ml-auto">
            {passo < PASSOS.length - 1 ? (
              <Botao
                variante="ouro"
                tamanho="lg"
                disabled={!podeAvancar}
                onClick={() => setPasso((p) => p + 1)}
              >
                Continuar
              </Botao>
            ) : (
              <Botao
                variante="ouro"
                tamanho="lg"
                disabled={!podeAvancar}
                aCarregar={ocupado}
                onClick={concluir}
              >
                Criar o cardápio
              </Botao>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EditorCardapioInicial({
  cardapio,
  aoMudar,
}: {
  cardapio: CategoriaInicial[];
  aoMudar: (c: CategoriaInicial[]) => void;
}) {
  function alterarItem(ci: number, ii: number, parcial: Partial<{ nome: string; preco: number }>) {
    const novo = cardapio.map((categoria, i) =>
      i !== ci
        ? categoria
        : {
            ...categoria,
            itens: categoria.itens.map((item, j) => (j === ii ? { ...item, ...parcial } : item)),
          },
    );
    aoMudar(novo);
  }

  function removerItem(ci: number, ii: number) {
    aoMudar(
      cardapio.map((categoria, i) =>
        i !== ci ? categoria : { ...categoria, itens: categoria.itens.filter((_, j) => j !== ii) },
      ),
    );
  }

  function juntarItem(ci: number) {
    aoMudar(
      cardapio.map((categoria, i) =>
        i !== ci
          ? categoria
          : { ...categoria, itens: [...categoria.itens, { nome: '', preco: 0, descricao: null }] },
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cardapio.map((categoria, ci) => (
        <div key={ci} className="vidro rounded-cartao">
          <div className="border-b border-linha px-4 py-3">
            <input
              value={categoria.nome}
              aria-label="Nome da categoria"
              onChange={(e) =>
                aoMudar(
                  cardapio.map((c, i) => (i === ci ? { ...c, nome: e.target.value } : c)),
                )
              }
              className="w-full border-none bg-transparent font-display text-lg text-creme outline-none focus:text-ouro"
            />
          </div>

          <ul className="divide-y divide-linha">
            {categoria.itens.map((item, ii) => (
              <li key={ii} className="flex items-center gap-2 px-4 py-2.5">
                <input
                  value={item.nome}
                  aria-label="Nome do prato"
                  placeholder="Nome do prato"
                  onChange={(e) => alterarItem(ci, ii, { nome: e.target.value })}
                  className="min-w-0 flex-1 border-none bg-transparent font-sans text-sm text-creme outline-none placeholder:text-tenue"
                />
                <input
                  value={item.preco || ''}
                  aria-label="Preço"
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(e) =>
                    alterarItem(ci, ii, { preco: Number(e.target.value.replace(/\D/g, '')) || 0 })
                  }
                  className="w-[86px] shrink-0 border-none bg-transparent text-right font-sans text-sm font-bold text-creme outline-none placeholder:text-tenue"
                />
                <span className="shrink-0 font-sans text-xs text-tenue">Kz</span>
                <button
                  type="button"
                  onClick={() => removerItem(ci, ii)}
                  aria-label={`Remover ${item.nome || 'prato'}`}
                  className="shrink-0 px-1 text-sm text-tenue transition-colors hover:text-creme"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between px-4 py-2.5">
            <button
              type="button"
              onClick={() => juntarItem(ci)}
              className="font-sans text-xs font-semibold text-tenue transition-colors hover:text-creme"
            >
              + prato
            </button>
            <span className="font-sans text-xs text-tenue">
              {categoria.itens.length}{' '}
              {categoria.itens.length === 1 ? 'prato' : 'pratos'} ·{' '}
              {formatarKz(categoria.itens.reduce((s, i) => s + i.preco, 0))}
            </span>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => aoMudar([...cardapio, { nome: 'Nova categoria', itens: [] }])}
        className="self-start rounded-cartao border border-linha px-4 py-2.5 font-sans text-xs font-semibold text-tenue transition-colors duration-200 hover:border-creme/30 hover:text-creme"
      >
        + Nova categoria
      </button>
    </div>
  );
}
