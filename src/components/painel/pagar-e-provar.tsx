'use client';

import * as React from 'react';
import { Botao } from '@/components/ui/botao';
import { COMPROVATIVO, CONTA_PARA_PAGAR, DIAS_PROVISORIOS } from '@/config/pagamento';
import { enviarComprovativo } from '@/app/painel/comprovativo';
import { formatarKz } from '@/lib/format';
import { PRECO_PLANO } from '@/lib/planos';
import { NOME_PLANO, type Restaurante } from '@/lib/tipos';

/**
 * Pagar, e provar que se pagou.
 *
 * São dois passos e mostram-se um de cada vez. Pôr as credenciais e o
 * carregamento do ficheiro lado a lado no mesmo ecrã fazia parecer que
 * se podia subir o comprovativo antes de transferir — e quem chega aqui
 * chega aflito, com o painel fechado, sem paciência para descobrir a
 * ordem sozinho.
 */
export function PagarEProvar({ restaurante }: { restaurante: Restaurante }) {
  const [passo, setPasso] = React.useState<1 | 2>(1);
  const [ficheiro, setFicheiro] = React.useState<File | null>(null);
  const [aEnviar, setAEnviar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [feito, setFeito] = React.useState(false);

  const preco = PRECO_PLANO[restaurante.plano];

  async function enviar() {
    if (!ficheiro) return;

    setAEnviar(true);
    setErro(null);

    const dados = new FormData();
    dados.set('comprovativo', ficheiro);

    const r = await enviarComprovativo(dados);

    setAEnviar(false);
    if (!r.ok) {
      setErro(r.erro ?? 'Não foi possível enviar.');
      return;
    }

    setFeito(true);
    // A porta reabriu do lado do servidor; é preciso ir buscar a página
    // outra vez para o painel aparecer.
    setTimeout(() => window.location.reload(), 2200);
  }

  if (feito) {
    return (
      <div className="rounded-cartao border border-linha p-6 text-center">
        <p className="font-display text-2xl text-creme">Recebido.</p>
        <p className="mx-auto mt-3 max-w-[46ch] text-pretty font-sans text-sm leading-relaxed text-tenue">
          O painel está a abrir. Fica aberto {DIAS_PROVISORIOS} dias enquanto confirmamos a
          transferência no banco — depois disso passa ao mês completo, sem ter de fazer mais nada.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ---------------------------------------------------------- */}
      {/* Passo 1 — para onde transferir                              */}
      {/* ---------------------------------------------------------- */}
      {passo === 1 ? (
        <div>
          <p className="font-sans text-sm leading-relaxed text-tenue">
            Transfira <span className="text-creme">{formatarKz(preco)}</span> por uma destas vias, e
            guarde o comprovativo.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <Credencial
              rotulo="Multicaixa Express"
              valor={CONTA_PARA_PAGAR.express}
              nota="O mais rápido, pelo telemóvel."
            />
            <Credencial
              rotulo="IBAN"
              valor={CONTA_PARA_PAGAR.iban}
              nota={`Titular: ${CONTA_PARA_PAGAR.titular}`}
            />
          </div>

          <p className="mt-5 text-pretty font-sans text-xs leading-normal text-tenue">
            Ponha <span className="text-creme">{restaurante.slug}</span> na descrição da
            transferência, se o seu banco deixar. Ajuda a encontrar o seu pagamento — mas se
            esquecer, o comprovativo chega.
          </p>

          <Botao
            variante="ouro"
            tamanho="lg"
            className="mt-6 w-full sm:w-auto"
            onClick={() => setPasso(2)}
          >
            Já transferi — enviar comprovativo
          </Botao>
        </div>
      ) : (
        /* -------------------------------------------------------- */
        /* Passo 2 — o comprovativo                                  */
        /* -------------------------------------------------------- */
        <div>
          <button
            type="button"
            onClick={() => setPasso(1)}
            className="font-sans text-xs text-tenue underline underline-offset-4 transition-colors hover:text-creme"
          >
            ← Ver outra vez para onde transferir
          </button>

          <p className="mt-4 font-sans text-sm leading-relaxed text-tenue">
            Envie a foto ou o PDF do comprovativo da transferência de{' '}
            <span className="text-creme">{formatarKz(preco)}</span>.
          </p>

          <label
            htmlFor="comprovativo"
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-cartao border border-dashed border-linha px-5 py-8 text-center transition-colors hover:border-ouro"
          >
            <span className="font-sans text-sm text-creme">
              {ficheiro ? ficheiro.name : 'Escolher o ficheiro'}
            </span>
            <span className="mt-1 font-sans text-xs text-tenue">
              {ficheiro
                ? `${(ficheiro.size / 1024 / 1024).toFixed(1)} MB — toque para trocar`
                : 'Foto (JPG, PNG) ou PDF, até 6 MB'}
            </span>
            <input
              id="comprovativo"
              type="file"
              accept={COMPROVATIVO.tipos.join(',')}
              className="sr-only"
              onChange={(e) => {
                setFicheiro(e.target.files?.[0] ?? null);
                setErro(null);
              }}
            />
          </label>

          {erro ? (
            <p className="mt-3 font-sans text-sm text-[#e0655a]" role="alert">
              {erro}
            </p>
          ) : null}

          <Botao
            variante="ouro"
            tamanho="lg"
            className="mt-5 w-full sm:w-auto"
            disabled={!ficheiro || aEnviar}
            onClick={enviar}
          >
            {aEnviar ? 'A enviar…' : 'Enviar comprovativo'}
          </Botao>

          <p className="mt-4 text-pretty font-sans text-xs leading-normal text-tenue">
            O painel reabre assim que o comprovativo entrar, e fica aberto {DIAS_PROVISORIOS} dias
            enquanto confirmamos no banco. Depois disso passa ao mês completo.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Um número para copiar.
 *
 * Copiar à mão um IBAN de 21 dígitos de um ecrã de telemóvel para a app
 * do banco é onde se engana quem estava a pagar bem. O botão de copiar
 * não é conforto: é o que evita o dinheiro ir parar a outra conta.
 */
function Credencial({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  const [copiado, setCopiado] = React.useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor.replace(/\s/g, ''));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão para a área de transferência: fica a leitura */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-cartao border border-linha px-4 py-3">
      <div className="min-w-0">
        <p className="etiqueta text-tenue">{rotulo}</p>
        {/*
          Quebra em vez de cortar. Com `truncate`, no telemóvel o IBAN
          aparecia "0040.0000.8753.8936...." — e um IBAN cortado é pior
          do que nenhum: quem o quer conferir contra a app do banco não
          consegue, e fica sem saber se está a pagar à pessoa certa.
        */}
        <p className="mt-1 break-all font-sans text-base tabular-nums text-creme">{valor}</p>
        {nota ? <p className="mt-0.5 font-sans text-xs text-tenue">{nota}</p> : null}
      </div>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-full border border-linha px-3 py-1.5 font-sans text-xs text-creme transition-colors hover:border-ouro hover:text-ouro"
      >
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}
