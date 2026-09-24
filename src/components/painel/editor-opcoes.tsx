'use client';

import * as React from 'react';
import { Plus, Ruler, Sparkles, Trash2, X } from 'lucide-react';
import { Botao } from '@/components/ui/botao';
import { Campo } from '@/components/ui/campo';
import { Interruptor } from '@/components/ui/interruptor';
import { apagarGrupo, guardarGrupo } from '@/app/painel/cardapio/accoes-sala';
import { formatarKz } from '@/lib/format';
import type { GrupoOpcoes } from '@/lib/tipos';
import { cn } from '@/lib/utils';

/**
 * As opções de um prato: o grupo de tamanhos e os grupos de extras.
 *
 * Cada grupo grava-se sozinho, com o seu botão. Gravar tudo de uma vez,
 * com o prato, fazia um erro num extra perder o nome e o preço que o dono
 * acabou de escrever — e é no extra que se erra, porque é onde se
 * escrevem mais números.
 */

type OpcaoRascunho = {
  chave: string;
  id?: string;
  nome: string;
  nome_en?: string;
  preco: string;
  disponivel: boolean;
};

type GrupoRascunho = {
  chave: string;
  id?: string;
  nome: string;
  nome_en?: string;
  tipo: 'variante' | 'extra';
  minimo: number;
  maximo: number;
  opcoes: OpcaoRascunho[];
  sujo: boolean;
};

let contador = 0;
const chaveNova = () => `n${Date.now()}-${contador++}`;

function doServidor(g: GrupoOpcoes): GrupoRascunho {
  return {
    chave: g.id,
    id: g.id,
    nome: g.nome,
    nome_en: g.nome_en ?? '',
    tipo: g.tipo,
    minimo: g.minimo,
    maximo: g.maximo,
    sujo: false,
    opcoes: g.opcoes.map((o) => ({
      chave: o.id,
      id: o.id,
      nome: o.nome,
      nome_en: o.nome_en ?? '',
      preco: String(o.preco),
      disponivel: o.disponivel,
    })),
  };
}

function paraOServidor(g: GrupoRascunho): GrupoOpcoes {
  return {
    id: g.id ?? g.chave,
    nome: g.nome,
    nome_en: g.nome_en?.trim() || null,
    tipo: g.tipo,
    minimo: g.minimo,
    maximo: g.maximo,
    ordem: 0,
    opcoes: g.opcoes.map((o, ordem) => ({
      id: o.id ?? o.chave,
      nome: o.nome,
      nome_en: o.nome_en?.trim() || null,
      preco: Number(o.preco.replace(',', '.')) || 0,
      disponivel: o.disponivel,
      ordem,
    })),
  };
}

export function EditorOpcoes({
  itemId,
  grupos: iniciais,
  demonstracao,
  ingles = false,
  aoMudar,
}: {
  itemId: string;
  grupos: GrupoOpcoes[];
  demonstracao: boolean;
  /** Com o cardápio em inglês, cada nome tem o seu campo em inglês. */
  ingles?: boolean;
  /** Para o gestor actualizar a lista sem recarregar. */
  aoMudar: (grupos: GrupoOpcoes[]) => void;
}) {
  const [grupos, setGrupos] = React.useState<GrupoRascunho[]>(() => iniciais.map(doServidor));
  const temTamanhos = grupos.some((g) => g.tipo === 'variante');

  function actualizar(chave: string, mudanca: Partial<GrupoRascunho>) {
    setGrupos((gs) => gs.map((g) => (g.chave === chave ? { ...g, ...mudanca, sujo: true } : g)));
  }

  function juntarGrupo(tipo: 'variante' | 'extra') {
    setGrupos((gs) => [
      ...gs,
      {
        chave: chaveNova(),
        nome: tipo === 'variante' ? 'Tamanho' : 'Extras',
        tipo,
        minimo: tipo === 'variante' ? 1 : 0,
        maximo: tipo === 'variante' ? 1 : 2,
        sujo: true,
        opcoes:
          tipo === 'variante'
            ? [
                { chave: chaveNova(), nome: 'Pequeno', preco: '', disponivel: true },
                { chave: chaveNova(), nome: 'Grande', preco: '', disponivel: true },
              ]
            : [{ chave: chaveNova(), nome: '', preco: '', disponivel: true }],
      },
    ]);
  }

  function publicar(lista: GrupoRascunho[]) {
    aoMudar(lista.filter((g) => g.id).map(paraOServidor));
  }

  return (
    <section aria-labelledby={`opcoes-${itemId}`} className="mt-7">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`opcoes-${itemId}`} className="font-sans text-sm font-semibold text-creme/85">
          Tamanhos e extras
        </h3>
        <span className="font-sans text-xs text-tenue">O cliente escolhe antes de juntar ao pedido</span>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {grupos.map((grupo) => (
          <CartaoGrupo
            key={grupo.chave}
            grupo={grupo}
            itemId={itemId}
            demonstracao={demonstracao}
            ingles={ingles}
            aoMudar={(m) => actualizar(grupo.chave, m)}
            aoGravar={(id) => {
              setGrupos((gs) => {
                const novos = gs.map((g) => (g.chave === grupo.chave ? { ...g, id, sujo: false } : g));
                publicar(novos);
                return novos;
              });
            }}
            aoApagar={() => {
              setGrupos((gs) => {
                const novos = gs.filter((g) => g.chave !== grupo.chave);
                publicar(novos);
                return novos;
              });
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!temTamanhos ? (
          <button
            type="button"
            onClick={() => juntarGrupo('variante')}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-dashed border-black/20 px-4 font-sans text-sm font-semibold text-creme/85 transition-colors hover:border-laranja hover:text-laranja"
          >
            <Ruler className="h-4 w-4" aria-hidden />
            Tamanhos
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => juntarGrupo('extra')}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-dashed border-black/20 px-4 font-sans text-sm font-semibold text-creme/85 transition-colors hover:border-laranja hover:text-laranja"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Grupo de extras
        </button>
      </div>
    </section>
  );
}

function CartaoGrupo({
  grupo,
  itemId,
  demonstracao,
  ingles,
  aoMudar,
  aoGravar,
  aoApagar,
}: {
  grupo: GrupoRascunho;
  itemId: string;
  demonstracao: boolean;
  ingles: boolean;
  aoMudar: (m: Partial<GrupoRascunho>) => void;
  aoGravar: (id: string) => void;
  aoApagar: () => void;
}) {
  const [aGravar, iniciar] = React.useTransition();
  const [erro, setErro] = React.useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = React.useState(false);
  const tamanho = grupo.tipo === 'variante';

  function mudarOpcao(chave: string, mudanca: Partial<OpcaoRascunho>) {
    aoMudar({ opcoes: grupo.opcoes.map((o) => (o.chave === chave ? { ...o, ...mudanca } : o)) });
  }

  function gravar() {
    setErro(null);
    iniciar(async () => {
      const r = await guardarGrupo({
        itemId,
        id: grupo.id,
        nome: grupo.nome,
        ...(ingles ? { nome_en: grupo.nome_en } : {}),
        tipo: grupo.tipo,
        minimo: grupo.minimo,
        maximo: grupo.maximo,
        opcoes: grupo.opcoes.map((o) => ({
          id: o.id,
          nome: o.nome,
          ...(ingles ? { nome_en: o.nome_en } : {}),
          preco: o.preco.replace(/\s/g, '').replace(',', '.') || '0',
          disponivel: o.disponivel,
        })),
      });
      if (!r.ok) setErro(r.erro);
      else aoGravar(r.id ?? grupo.id ?? grupo.chave);
    });
  }

  function apagar() {
    if (!grupo.id) return aoApagar();
    if (!aConfirmar) return setAConfirmar(true);
    iniciar(async () => {
      const r = await apagarGrupo({ id: grupo.id });
      if (!r.ok) setErro(r.erro);
      else aoApagar();
    });
  }

  return (
    <div className={cn('rounded-cartao border bg-black/[0.02] p-4', grupo.sujo ? 'border-laranja/40' : 'border-black/[0.08]')}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-laranja">
          {tamanho ? <Ruler className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        </span>
        <input
          value={grupo.nome}
          onChange={(e) => aoMudar({ nome: e.target.value })}
          aria-label="Nome do grupo"
          maxLength={40}
          className="min-w-0 flex-1 rounded-campo border border-transparent bg-transparent px-2 py-1.5 font-sans text-base font-semibold text-creme outline-none hover:border-black/10 focus:border-laranja/60"
        />
        <button
          type="button"
          onClick={apagar}
          onBlur={() => setAConfirmar(false)}
          aria-label={aConfirmar ? `Confirmar: apagar ${grupo.nome}` : `Apagar ${grupo.nome}`}
          className={cn(
            'flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 font-sans text-xs font-semibold transition-colors',
            aConfirmar ? 'bg-[#ff8a78]/15 text-[#ff8a78]' : 'w-10 px-0 text-tenue hover:bg-black/[0.06] hover:text-creme',
          )}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {aConfirmar ? 'Apagar?' : null}
        </button>
      </div>

      {ingles ? (
        <div className="mt-1 flex items-center gap-2 pl-10">
          <span className="etiqueta shrink-0 text-[11px] text-tenue" aria-hidden>
            EN
          </span>
          <input
            value={grupo.nome_en ?? ''}
            onChange={(e) => aoMudar({ nome_en: e.target.value })}
            aria-label={`Nome do grupo em inglês`}
            placeholder={tamanho ? 'Size' : 'Extras'}
            maxLength={40}
            className="h-9 min-w-0 flex-1 rounded-campo border border-black/[0.08] bg-transparent px-2.5 font-sans text-sm text-creme outline-none placeholder:text-creme/30 hover:border-black/15 focus:border-laranja/60"
          />
        </div>
      ) : null}

      <p className="mt-1 pl-10 font-sans text-xs text-tenue">
        {tamanho
          ? 'O cliente escolhe um. O preço de cada tamanho é o preço do prato.'
          : 'O preço de cada extra soma-se ao do prato.'}
      </p>

      {!tamanho ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-10 font-sans text-sm text-creme/85">
          <label className="flex items-center gap-2">
            Mínimo
            <Contador valor={grupo.minimo} min={0} max={grupo.maximo} aoMudar={(v) => aoMudar({ minimo: v })} rotulo="mínimo" />
          </label>
          <label className="flex items-center gap-2">
            Máximo
            <Contador
              valor={grupo.maximo}
              min={Math.max(1, grupo.minimo)}
              max={Math.max(1, grupo.opcoes.length)}
              aoMudar={(v) => aoMudar({ maximo: v })}
              rotulo="máximo"
            />
          </label>
        </div>
      ) : null}

      <ul className="mt-3 flex flex-col gap-2">
        {grupo.opcoes.map((opcao) => (
          <li key={opcao.chave} className="flex flex-wrap items-center gap-2">
            <Campo
              value={opcao.nome}
              maxLength={40}
              onChange={(e) => mudarOpcao(opcao.chave, { nome: e.target.value })}
              placeholder={tamanho ? 'Médio' : 'Queijo'}
              aria-label="Nome da opção"
              className="h-11 min-w-0 flex-1"
            />
            <div className="relative w-[112px] shrink-0">
              {!tamanho ? (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm text-tenue">+</span>
              ) : null}
              <Campo
                value={opcao.preco}
                inputMode="decimal"
                onChange={(e) => mudarOpcao(opcao.chave, { preco: e.target.value.replace(/[^\d.,]/g, '') })}
                placeholder={tamanho ? '4500' : '500'}
                aria-label={tamanho ? `Preço de ${opcao.nome || 'este tamanho'}` : `Preço a somar por ${opcao.nome || 'este extra'}`}
                className={cn('h-11 pr-2 text-right tabular-nums', !tamanho && 'pl-6')}
              />
            </div>
            <Interruptor
              checked={opcao.disponivel}
              onCheckedChange={(v) => mudarOpcao(opcao.chave, { disponivel: v })}
              aria-label={`${opcao.nome || 'Opção'} disponível`}
            />
            <button
              type="button"
              onClick={() => aoMudar({ opcoes: grupo.opcoes.filter((o) => o.chave !== opcao.chave) })}
              disabled={grupo.opcoes.length <= 1}
              aria-label={`Tirar ${opcao.nome || 'esta opção'}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-tenue hover:bg-black/[0.06] hover:text-creme disabled:opacity-30"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            {ingles ? (
              <label className="flex w-full items-center gap-2 pl-1">
                <span className="etiqueta shrink-0 text-[11px] text-tenue">EN</span>
                <span className="sr-only">{`${opcao.nome || 'Opção'} em inglês`}</span>
                <input
                  value={opcao.nome_en ?? ''}
                  onChange={(e) => mudarOpcao(opcao.chave, { nome_en: e.target.value })}
                  placeholder={tamanho ? 'Medium' : 'Cheese'}
                  maxLength={40}
                  className="h-9 min-w-0 flex-1 rounded-campo border border-black/[0.08] bg-transparent px-2.5 font-sans text-sm text-creme outline-none placeholder:text-creme/30 hover:border-black/15 focus:border-laranja/60"
                />
              </label>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            aoMudar({ opcoes: [...grupo.opcoes, { chave: chaveNova(), nome: '', preco: '', disponivel: true }] })
          }
          disabled={grupo.opcoes.length >= 20}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 font-sans text-sm font-semibold text-tenue hover:text-creme disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {tamanho ? 'Tamanho' : 'Extra'}
        </button>

        <Botao
          variante={grupo.sujo ? 'laranja' : 'contorno'}
          tamanho="md"
          aCarregar={aGravar}
          disabled={!grupo.sujo || demonstracao}
          onClick={gravar}
        >
          {grupo.sujo ? 'Guardar grupo' : 'Guardado'}
        </Botao>
      </div>

      {erro ? (
        <p role="alert" className="mt-2 font-sans text-sm text-[#ff8a78]">
          {erro}
        </p>
      ) : null}
      {grupo.sujo && tamanho && grupo.opcoes.some((o) => o.preco) ? (
        <p className="mt-2 font-sans text-xs text-tenue">
          O cardápio vai mostrar "desde {formatarKz(Math.min(...grupo.opcoes.map((o) => Number(o.preco.replace(',', '.')) || Infinity)))}".
        </p>
      ) : null}
    </div>
  );
}

function Contador({
  valor,
  min,
  max,
  aoMudar,
  rotulo,
}: {
  valor: number;
  min: number;
  max: number;
  aoMudar: (v: number) => void;
  rotulo: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10">
      <button
        type="button"
        onClick={() => aoMudar(Math.max(min, valor - 1))}
        disabled={valor <= min}
        aria-label={`Menos um no ${rotulo}`}
        className="flex h-10 w-10 items-center justify-center text-creme disabled:opacity-30"
      >
        −
      </button>
      <span className="w-6 text-center tabular-nums">{valor}</span>
      <button
        type="button"
        onClick={() => aoMudar(Math.min(max, valor + 1))}
        disabled={valor >= max}
        aria-label={`Mais um no ${rotulo}`}
        className="flex h-10 w-10 items-center justify-center text-creme disabled:opacity-30"
      >
        +
      </button>
    </span>
  );
}
