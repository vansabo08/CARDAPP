'use client';

import * as React from 'react';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Erro, EscolherFicheiro, Rotulo } from '@/components/ui/campo';
import { Distintivo } from '@/components/ui/distintivo';
import { FolhaInferior } from '@/components/ui/folha-inferior';
import { Interruptor } from '@/components/ui/interruptor';
import { FotoPrato } from '@/components/prato-visual';
import { formatarKz } from '@/lib/format';
import { enviarImagem } from '@/lib/armazenamento';
import { cn } from '@/lib/utils';
import {
  LIMITES_PLANO,
  type CategoriaComPratos,
  type GrupoOpcoes,
  type MenuHorario,
  type Plano,
  type Prato,
} from '@/lib/tipos';
import { temFuncionalidade } from '@/lib/funcionalidades';
import { deCampoLuanda, paraCampoLuanda } from '@/lib/horarios';
import { descontoEmPercentagem, promocaoActiva } from '@/lib/precos';
import { CartaoUpgrade } from '@/components/painel/cartao-upgrade';
import { EditorOpcoes } from '@/components/painel/editor-opcoes';
import { HorariosDaCasa } from '@/components/painel/horarios-da-casa';
import {
  atribuirMenu,
  nomeDaCategoriaEmIngles,
  traduzirCardapioTodo,
  traduzirTextos,
} from '@/app/painel/cardapio/accoes-sala';
import { Languages, Loader2 } from 'lucide-react';
import {
  actualizarPrato,
  alternarDisponivel,
  apagarCategoria,
  apagarPrato,
  criarCategoria,
  criarPrato,
  renomearCategoria,
  reordenarCategorias,
} from '@/app/painel/cardapio/accoes';

type Rascunho = {
  id: string | null;
  categoryId: string;
  nome: string;
  descricao: string;
  preco: string;
  foto_url: string | null;
  disponivel: boolean;
  /** Os do Plano Sala. As datas como o campo as mostra: hora de Luanda. */
  preco_promocional: string;
  promo_inicio: string;
  promo_fim: string;
  prato_do_dia: boolean;
  /** Em inglês — só no Plano Sala. Vazios, o cardápio mostra o português. */
  nome_en: string;
  descricao_en: string;
  grupos: GrupoOpcoes[];
};

function rascunhoDe(prato: Prato, categoryId: string): Rascunho {
  return {
    id: prato.id,
    categoryId,
    nome: prato.nome,
    descricao: prato.descricao ?? '',
    preco: String(prato.preco),
    foto_url: prato.foto_url,
    disponivel: prato.disponivel,
    preco_promocional: prato.preco_promocional != null ? String(prato.preco_promocional) : '',
    promo_inicio: paraCampoLuanda(prato.promo_inicio),
    promo_fim: paraCampoLuanda(prato.promo_fim),
    prato_do_dia: Boolean(prato.prato_do_dia),
    nome_en: prato.nome_en ?? '',
    descricao_en: prato.descricao_en ?? '',
    grupos: prato.grupos ?? [],
  };
}

const RASCUNHO_VAZIO = (categoryId: string): Rascunho => ({
  id: null,
  categoryId,
  nome: '',
  descricao: '',
  preco: '',
  foto_url: null,
  disponivel: true,
  preco_promocional: '',
  promo_inicio: '',
  promo_fim: '',
  prato_do_dia: false,
  nome_en: '',
  descricao_en: '',
  grupos: [],
});

export function GestorCardapio({
  categoriasIniciais,
  plano,
  demonstracao,
  menusIniciais = [],
  esgotadoModo = 'mostrar',
  eDono = true,
}: {
  categoriasIniciais: CategoriaComPratos[];
  plano: Plano;
  demonstracao: boolean;
  menusIniciais?: MenuHorario[];
  esgotadoModo?: 'mostrar' | 'esconder';
  /** O modo do esgotado é uma definição da casa: só o dono a muda. */
  eDono?: boolean;
}) {
  const sala = temFuncionalidade({ plano }, 'opcoes');
  const ingles = temFuncionalidade({ plano }, 'multi_idioma');
  const [menus, setMenus] = React.useState(menusIniciais);
  const [categorias, setCategorias] = React.useState(categoriasIniciais);
  const [rascunho, setRascunho] = React.useState<Rascunho | null>(null);
  const [novaCategoria, setNovaCategoria] = React.useState('');
  const [aCriarCategoria, setACriarCategoria] = React.useState(false);
  const [arrastada, setArrastada] = React.useState<string | null>(null);
  const [aApagar, setAApagar] = React.useState<string | null>(null);

  const limites = LIMITES_PLANO[plano];
  const totalPratos = categorias.reduce((s, c) => s + c.itens.length, 0);
  const atingiuLimite = totalPratos >= limites.pratos;

  /* ----------------------------- categorias ---------------------------- */

  async function adicionarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) return;

    const provisorio: CategoriaComPratos = {
      id: `nova-${Date.now()}`,
      restaurant_id: '',
      nome,
      ordem: categorias.length,
      itens: [],
    };
    setCategorias((c) => [...c, provisorio]);
    setNovaCategoria('');
    setACriarCategoria(false);

    const resultado = await criarCategoria(nome);
    if (resultado.id) {
      setCategorias((c) => c.map((x) => (x.id === provisorio.id ? { ...x, id: resultado.id! } : x)));
    }
  }

  async function mudarNome(id: string, nome: string) {
    setCategorias((c) => c.map((x) => (x.id === id ? { ...x, nome } : x)));
    await renomearCategoria(id, nome);
  }

  function mudarNomeEmIngles(id: string, nome_en: string) {
    setCategorias((c) => c.map((x) => (x.id === id ? { ...x, nome_en } : x)));
  }

  async function gravarNomeEmIngles(id: string, nome_en: string) {
    if (id.startsWith('nova-')) return;
    await nomeDaCategoriaEmIngles({ categoriaId: id, nome_en });
  }

  async function mudarHorario(categoriaId: string, menuId: string | null) {
    setCategorias((c) => c.map((x) => (x.id === categoriaId ? { ...x, menu_id: menuId } : x)));
    await atribuirMenu({ categoriaId, menuId });
  }

  function mudarGrupos(itemId: string, grupos: GrupoOpcoes[]) {
    setCategorias((c) =>
      c.map((cat) => ({ ...cat, itens: cat.itens.map((i) => (i.id === itemId ? { ...i, grupos } : i)) })),
    );
  }

  async function removerCategoria(id: string) {
    setAApagar(null);
    setCategorias((c) => c.filter((x) => x.id !== id));
    await apagarCategoria(id);
  }

  async function mover(id: string, direccao: -1 | 1) {
    const indice = categorias.findIndex((c) => c.id === id);
    const destino = indice + direccao;
    if (indice < 0 || destino < 0 || destino >= categorias.length) return;

    const novas = [...categorias];
    [novas[indice], novas[destino]] = [novas[destino], novas[indice]];
    setCategorias(novas);
    await reordenarCategorias(novas.map((c) => c.id));
  }

  async function largarSobre(alvoId: string) {
    if (!arrastada || arrastada === alvoId) return;

    const origem = categorias.findIndex((c) => c.id === arrastada);
    const destino = categorias.findIndex((c) => c.id === alvoId);
    if (origem < 0 || destino < 0) return;

    const novas = [...categorias];
    const [movida] = novas.splice(origem, 1);
    novas.splice(destino, 0, movida);
    setCategorias(novas);
    setArrastada(null);
    await reordenarCategorias(novas.map((c) => c.id));
  }

  /* -------------------------------- pratos ------------------------------ */

  async function gravarPrato(dados: Rascunho) {
    const preco = Number(String(dados.preco).replace(/\s/g, '').replace(',', '.'));
    const payload = {
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim() || null,
      preco: Number.isFinite(preco) ? preco : 0,
      foto_url: dados.foto_url,
      disponivel: dados.disponivel,
      ...(sala
        ? {
            preco_promocional: dados.preco_promocional.trim()
              ? Number(dados.preco_promocional.replace(/\s/g, '').replace(',', '.'))
              : null,
            promo_inicio: deCampoLuanda(dados.promo_inicio),
            promo_fim: deCampoLuanda(dados.promo_fim),
            prato_do_dia: dados.prato_do_dia,
          }
        : {}),
      ...(ingles
        ? { nome_en: dados.nome_en.trim() || null, descricao_en: dados.descricao_en.trim() || null }
        : {}),
    };

    // Um prato do dia por casa: a base desliga os outros, e o ecrã também.
    if (sala && dados.prato_do_dia) {
      setCategorias((c) =>
        c.map((cat) => ({ ...cat, itens: cat.itens.map((i) => ({ ...i, prato_do_dia: false })) })),
      );
    }

    if (dados.id) {
      setCategorias((c) =>
        c.map((cat) => ({
          ...cat,
          itens: cat.itens.map((i) => (i.id === dados.id ? { ...i, ...payload } : i)),
        })),
      );
      await actualizarPrato(dados.id, payload);
    } else {
      const provisorio: Prato = {
        id: `novo-${Date.now()}`,
        category_id: dados.categoryId,
        ordem: 999,
        ...payload,
      };
      setCategorias((c) =>
        c.map((cat) =>
          cat.id === dados.categoryId ? { ...cat, itens: [...cat.itens, provisorio] } : cat,
        ),
      );
      const resultado = await criarPrato(dados.categoryId, payload);
      if (resultado.id) {
        setCategorias((c) =>
          c.map((cat) => ({
            ...cat,
            itens: cat.itens.map((i) => (i.id === provisorio.id ? { ...i, id: resultado.id! } : i)),
          })),
        );
      }
    }

    setRascunho(null);
  }

  async function removerPrato(id: string) {
    setCategorias((c) => c.map((cat) => ({ ...cat, itens: cat.itens.filter((i) => i.id !== id) })));
    setRascunho(null);
    await apagarPrato(id);
  }

  async function mudarDisponivel(id: string, valor: boolean) {
    setCategorias((c) =>
      c.map((cat) => ({
        ...cat,
        itens: cat.itens.map((i) => (i.id === id ? { ...i, disponivel: valor } : i)),
      })),
    );
    await alternarDisponivel(id, valor);
  }

  /* --------------------------------------------------------------------- */

  return (
    <div>
      {demonstracao ? (
        <p className="mt-8 rounded-cartao border border-laranja/30 bg-laranja/[0.06] px-4 py-3 font-sans text-xs leading-normal text-laranja">
          Modo de demonstração: pode mexer à vontade, mas as alterações não são gravadas enquanto o
          Supabase não estiver ligado.
        </p>
      ) : null}

      {atingiuLimite ? (
        <p className="superficie-leve mt-6 rounded-cartao px-4 py-3 font-sans text-xs leading-normal text-tenue">
          O plano Balcão vai até {limites.pratos} pratos e já lá chegou. Mude para o plano Mesa para
          continuar a acrescentar.
        </p>
      ) : null}

      {sala ? (
        <HorariosDaCasa
          menus={menus}
          aoMudar={setMenus}
          esgotadoModo={esgotadoModo}
          podeMudarEsgotado={eDono}
          demonstracao={demonstracao}
          ingles={ingles}
        />
      ) : (
        <CartaoUpgrade funcionalidade="opcoes" compacto className="mt-8" />
      )}

      {ingles ? (
        <TraduzirTudo demonstracao={demonstracao} />
      ) : (
        <CartaoUpgrade funcionalidade="multi_idioma" compacto className="mt-4" />
      )}

      <div className="mt-9 flex flex-col gap-4">
        {categorias.map((categoria, indice) => (
          <article
            key={categoria.id}
            draggable
            onDragStart={() => setArrastada(categoria.id)}
            onDragEnd={() => setArrastada(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => largarSobre(categoria.id)}
            className={cn(
              'superficie rounded-cartao transition-opacity duration-200',
              arrastada === categoria.id && 'opacity-40',
            )}
          >
            <header className="flex items-center gap-2 border-b border-linha px-3 py-3">
              <span
                aria-hidden
                title="Arraste para reordenar"
                className="flex h-9 w-7 cursor-grab items-center justify-center text-sm leading-none text-tenue transition-colors hover:text-creme active:cursor-grabbing"
              >
                ⠿
              </span>

              {/* Um campo que não parece campo não convida a ser editado:
                  o sublinhado só aparece quando o rato passa ou tem foco. */}
              <input
                value={categoria.nome}
                onChange={(e) => mudarNome(categoria.id, e.target.value)}
                aria-label="Nome da categoria"
                className="min-w-0 flex-1 rounded-campo border border-transparent bg-transparent px-2 py-1 font-display text-xl text-creme outline-none transition-colors duration-200 hover:border-linha focus:border-laranja/50 focus:bg-black/[0.04]"
              />

              {sala && menus.length ? (
                <label className="shrink-0">
                  <span className="sr-only">Horário de {categoria.nome}</span>
                  <select
                    value={categoria.menu_id ?? ''}
                    onChange={(e) => mudarHorario(categoria.id, e.target.value || null)}
                    className="h-9 max-w-[140px] appearance-none truncate rounded-full border border-black/10 bg-black/[0.04] px-3 font-sans text-xs font-semibold text-creme outline-none hover:border-black/25 focus-visible:border-laranja"
                  >
                    <option value="" className="bg-grafite-alto">Sempre</option>
                    {menus.map((m) => (
                      <option key={m.id} value={m.id} className="bg-grafite-alto">
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <span className="etiqueta shrink-0 rounded-full border border-linha px-2.5 py-1 tabular-nums text-tenue">
                {categoria.itens.length}
              </span>

              <div className="flex shrink-0 items-center">
                <BotaoIcone
                  rotulo="Subir categoria"
                  onClick={() => mover(categoria.id, -1)}
                  desactivado={indice === 0}
                >
                  ↑
                </BotaoIcone>
                <BotaoIcone
                  rotulo="Descer categoria"
                  onClick={() => mover(categoria.id, 1)}
                  desactivado={indice === categorias.length - 1}
                >
                  ↓
                </BotaoIcone>
                <BotaoIcone
                  rotulo="Apagar categoria"
                  onClick={() => setAApagar(categoria.id)}
                >
                  ×
                </BotaoIcone>
              </div>
            </header>

            {ingles ? (
              <label className="flex items-center gap-2 border-b border-linha px-4 py-2">
                <span className="etiqueta shrink-0 text-[11px] text-tenue">EN</span>
                <span className="sr-only">Nome de {categoria.nome} em inglês</span>
                <input
                  value={categoria.nome_en ?? ''}
                  maxLength={60}
                  onChange={(e) => mudarNomeEmIngles(categoria.id, e.target.value)}
                  onBlur={(e) => gravarNomeEmIngles(categoria.id, e.target.value)}
                  placeholder="Em inglês — vazio, mostra o português"
                  className="h-9 min-w-0 flex-1 rounded-campo border border-transparent bg-transparent px-2 font-sans text-sm text-creme/85 outline-none placeholder:text-creme/30 hover:border-linha focus:border-laranja/50 focus:bg-black/[0.04]"
                />
              </label>
            ) : null}

            {/* Apagar uma categoria leva os pratos todos atrás dela — a
                base de dados faz cascade. Um clique só é pouco para uma
                coisa que não se desfaz. */}
            {aApagar === categoria.id ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linha bg-[#e0655a]/10 px-4 py-3">
                <p className="font-sans text-xs leading-snug text-creme">
                  Apagar <span className="font-semibold">{categoria.nome || 'esta categoria'}</span>
                  {categoria.itens.length > 0 ? (
                    <>
                      {' '}e os{' '}
                      <span className="font-semibold">
                        {categoria.itens.length} {categoria.itens.length === 1 ? 'prato' : 'pratos'}
                      </span>{' '}
                      lá dentro?
                    </>
                  ) : (
                    '?'
                  )}{' '}
                  <span className="text-tenue">Não se desfaz.</span>
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Botao variante="discreto" tamanho="sm" onClick={() => setAApagar(null)}>
                    Cancelar
                  </Botao>
                  <button
                    type="button"
                    onClick={() => removerCategoria(categoria.id)}
                    className="rounded-full bg-[#e0655a] px-4 py-2 font-sans text-xs font-semibold text-grafite transition-opacity duration-200 hover:opacity-90"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ) : null}

            <ul className="divide-y divide-linha">
              {categoria.itens.map((prato) => (
                <li
                  key={prato.id}
                  className="group flex items-center gap-3.5 px-3 py-2.5 transition-colors duration-200 hover:bg-black/[0.03]"
                >
                  <button
                    type="button"
                    onClick={() => setRascunho(rascunhoDe(prato, categoria.id))}
                    className="flex min-w-0 flex-1 items-center gap-3.5 rounded-campo text-left"
                  >
                    <span
                      className={cn(
                        'relative block h-14 w-14 shrink-0 overflow-hidden rounded-campo bg-black/[0.04]',
                        !prato.disponivel && 'opacity-35 grayscale',
                      )}
                    >
                      <FotoPrato nome={prato.nome} url={prato.foto_url} tamanhos="128px" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'truncate font-display text-base leading-snug text-creme',
                            !prato.disponivel && 'text-tenue line-through decoration-1',
                          )}
                        >
                          {prato.nome}
                        </span>
                        {!prato.disponivel ? (
                          <span className="etiqueta shrink-0 rounded-full bg-black/[0.07] px-2 py-0.5 text-xs text-tenue">
                            Esgotado
                          </span>
                        ) : null}
                        {sala && prato.prato_do_dia ? (
                          <span className="shrink-0 rounded-full bg-laranja/15 px-2 py-0.5 font-sans text-xs font-semibold text-laranja">
                            ★ Do dia
                          </span>
                        ) : null}
                        {sala && promocaoActiva(prato) ? (
                          <span className="shrink-0 rounded-full bg-laranja px-2 py-0.5 font-sans text-xs font-bold text-creme">
                            -{descontoEmPercentagem(prato)}%
                          </span>
                        ) : null}
                        {sala && prato.grupos?.length ? (
                          <span className="hidden shrink-0 rounded-full border border-black/10 px-2 py-0.5 font-sans text-xs text-tenue sm:inline">
                            {prato.grupos.reduce((n, g) => n + g.opcoes.length, 0)} opções
                          </span>
                        ) : null}
                      </span>

                      {prato.descricao ? (
                        <span className="mt-0.5 block truncate font-sans text-xs text-tenue">
                          {prato.descricao}
                        </span>
                      ) : (
                        <span className="mt-0.5 block font-sans text-xs text-creme/40">
                          sem descrição
                        </span>
                      )}
                    </span>

                    <span
                      className={cn(
                        'shrink-0 text-right font-sans text-sm font-extrabold tabular-nums tracking-[-0.02em]',
                        prato.disponivel ? 'text-creme' : 'text-tenue',
                      )}
                    >
                      {formatarKz(prato.preco)}
                    </span>
                  </button>

                  <label className="flex shrink-0 cursor-pointer items-center gap-2 pl-3">
                    <span className="hidden font-sans text-xs text-tenue sm:block">
                      {prato.disponivel ? 'Hoje há' : 'Esgotou'}
                    </span>
                    <Interruptor
                      checked={prato.disponivel}
                      onCheckedChange={(v) => mudarDisponivel(prato.id, v)}
                      aria-label={`${prato.nome} disponível hoje`}
                    />
                  </label>
                </li>
              ))}
            </ul>

            {!categoria.itens.length ? (
              <p className="px-4 py-6 text-center font-sans text-xs text-tenue">
                Ainda sem pratos nesta categoria.
              </p>
            ) : null}

            <div className="border-t border-linha px-3 py-2.5">
              <button
                type="button"
                disabled={atingiuLimite}
                onClick={() => setRascunho(RASCUNHO_VAZIO(categoria.id))}
                className="flex w-full items-center gap-2.5 rounded-campo px-2 py-2 font-sans text-xs font-semibold text-tenue transition-colors duration-200 hover:bg-black/[0.05] hover:text-creme disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-linha text-sm leading-none">
                  +
                </span>
                Novo prato em {categoria.nome || 'esta categoria'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6">
        {aCriarCategoria ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Campo
              autoFocus
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarCategoria()}
              placeholder="Grelhados, Bebidas, Sobremesas…"
              className="w-full sm:w-[280px]"
            />
            <Botao variante="laranja" tamanho="md" onClick={adicionarCategoria}>
              Criar
            </Botao>
            <Botao variante="discreto" tamanho="md" onClick={() => setACriarCategoria(false)}>
              Cancelar
            </Botao>
          </div>
        ) : (
          <Botao variante="contorno" tamanho="md" onClick={() => setACriarCategoria(true)}>
            + Nova categoria
          </Botao>
        )}
      </div>

      <FolhaPrato
        rascunho={rascunho}
        sala={sala}
        ingles={ingles}
        demonstracao={demonstracao}
        aoFechar={() => setRascunho(null)}
        aoGravar={gravarPrato}
        aoApagar={removerPrato}
        aoMudarGrupos={mudarGrupos}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BotaoIcone({
  children,
  rotulo,
  onClick,
  desactivado,
}: {
  children: React.ReactNode;
  rotulo: string;
  onClick: () => void;
  desactivado?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      disabled={desactivado}
      className="flex h-8 w-8 items-center justify-center rounded-campo text-sm text-tenue transition-colors duration-200 hover:bg-black/[0.06] hover:text-creme disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function FolhaPrato({
  rascunho,
  sala,
  ingles,
  demonstracao,
  aoFechar,
  aoGravar,
  aoApagar,
  aoMudarGrupos,
}: {
  rascunho: Rascunho | null;
  sala: boolean;
  ingles: boolean;
  demonstracao: boolean;
  aoFechar: () => void;
  aoGravar: (r: Rascunho) => void;
  aoApagar: (id: string) => void;
  aoMudarGrupos: (itemId: string, grupos: GrupoOpcoes[]) => void;
}) {
  const [dados, setDados] = React.useState<Rascunho | null>(rascunho);
  const [aEnviar, setAEnviar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDados(rascunho);
    setErro(null);
  }, [rascunho]);

  if (!dados) return null;

  async function escolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;

    setAEnviar(true);
    setErro(null);
    const resultado = await enviarImagem(ficheiro, 'pratos');
    setAEnviar(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    if (resultado.demonstracao) {
      setErro('Sem Supabase ligado não há onde guardar a foto.');
      return;
    }
    setDados((d) => (d ? { ...d, foto_url: resultado.url } : d));
  }

  const valido = dados.nome.trim().length > 0 && String(dados.preco).trim().length > 0;

  return (
    <FolhaInferior
      aberta
      aoFechar={aoFechar}
      titulo={dados.id ? 'Editar prato' : 'Novo prato'}
      claro={false}
    >
      <div className="flex min-h-0 flex-col overflow-y-auto px-5 pb-7 pt-2">
        <h2 className="font-display text-2xl text-creme">
          {dados.id ? 'Editar prato' : 'Novo prato'}
        </h2>

        <div className="mt-6 flex items-start gap-4">
          <span className="relative block h-[84px] w-[84px] shrink-0 overflow-hidden rounded-cartao border border-linha">
            <FotoPrato nome={dados.nome || 'Prato'} url={dados.foto_url} tamanhos="128px" />
          </span>
          <div className="min-w-0 flex-1">
            <Rotulo htmlFor="foto">Fotografia</Rotulo>
            <EscolherFicheiro
              id="foto"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={escolherFoto}
              rotulo={dados.foto_url ? 'Trocar fotografia' : 'Escolher fotografia'}
              disabled={aEnviar}
            />
            <p className="mt-2 font-sans text-xs text-tenue">
              {aEnviar ? 'A enviar…' : 'Sem foto, o cardápio mostra uma ilustração do prato.'}
            </p>
            {dados.foto_url ? (
              <button
                type="button"
                onClick={() => setDados((d) => (d ? { ...d, foto_url: null } : d))}
                className="mt-2 font-sans text-xs text-tenue underline underline-offset-4 hover:text-creme"
              >
                Remover fotografia
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <div>
            <Rotulo htmlFor="nome-prato">Nome</Rotulo>
            <Campo
              id="nome-prato"
              value={dados.nome}
              maxLength={80}
              onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              placeholder="Muamba de Galinha"
            />
          </div>

          <div>
            <Rotulo htmlFor="desc-prato">Descrição curta</Rotulo>
            <AreaTexto
              id="desc-prato"
              rows={2}
              maxLength={160}
              value={dados.descricao}
              onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
              placeholder="Galinha do campo, óleo de palma, quiabo e funge"
            />
          </div>

          {ingles ? (
            <SeccaoIngles dados={dados} aoMudar={(m) => setDados((d) => (d ? { ...d, ...m } : d))} />
          ) : null}

          <div>
            <Rotulo htmlFor="preco-prato">Preço em Kwanzas</Rotulo>
            <Campo
              id="preco-prato"
              inputMode="decimal"
              value={dados.preco}
              onChange={(e) => setDados({ ...dados, preco: e.target.value.replace(/[^\d.,]/g, '') })}
              placeholder="4500"
            />
            {dados.preco ? (
              <p className="mt-2 font-sans text-xs text-tenue">
                Aparece como{' '}
                <span className="text-creme">
                  {formatarKz(Number(String(dados.preco).replace(',', '.')) || 0)}
                </span>
              </p>
            ) : null}
          </div>

          <label className="flex items-center justify-between rounded-cartao border border-linha px-4 py-3.5">
            <span>
              <span className="block font-sans text-sm font-semibold text-creme">
                Disponível hoje
              </span>
              <span className="block font-sans text-xs text-tenue">
                Se desligar, aparece esbatido e não pode ser pedido.
              </span>
            </span>
            <Interruptor
              checked={dados.disponivel}
              onCheckedChange={(v) => setDados({ ...dados, disponivel: v })}
            />
          </label>

          {sala ? (
            <>
              <label className="flex items-center justify-between rounded-cartao border border-linha px-4 py-3.5">
                <span>
                  <span className="block font-sans text-sm font-semibold text-creme">★ Prato do dia</span>
                  <span className="block font-sans text-xs text-tenue">
                    Em destaque no topo do cardápio. Só há um: marcar este desmarca o outro.
                  </span>
                </span>
                <Interruptor
                  checked={dados.prato_do_dia}
                  onCheckedChange={(v) => setDados({ ...dados, prato_do_dia: v })}
                />
              </label>

              <SeccaoPromocao dados={dados} aoMudar={(m) => setDados({ ...dados, ...m })} />
            </>
          ) : null}
        </div>

        {sala ? (
          dados.id && !dados.id.startsWith('novo-') ? (
            <EditorOpcoes
              key={dados.id}
              itemId={dados.id}
              grupos={dados.grupos}
              demonstracao={demonstracao}
              ingles={ingles}
              aoMudar={(grupos) => {
                setDados((d) => (d ? { ...d, grupos } : d));
                aoMudarGrupos(dados.id!, grupos);
              }}
            />
          ) : (
            <p className="mt-6 rounded-cartao border border-dashed border-black/10 px-4 py-3 font-sans text-xs leading-normal text-tenue">
              Os tamanhos e os extras juntam-se depois de o prato estar no cardápio. Guarde-o, e volte a
              abri-lo.
            </p>
          )
        ) : (
          <CartaoUpgrade funcionalidade="opcoes" compacto className="mt-6" />
        )}

        {erro ? <Erro>{erro}</Erro> : null}

        <div className="mt-7 flex flex-col gap-2.5">
          <Botao
            variante="laranja"
            tamanho="lg"
            largo
            disabled={!valido || aEnviar}
            onClick={() => aoGravar(dados)}
          >
            {dados.id ? 'Guardar alterações' : 'Juntar ao cardápio'}
          </Botao>
          {dados.id ? (
            <Botao variante="discreto" tamanho="md" largo onClick={() => aoApagar(dados.id!)}>
              Apagar prato
            </Botao>
          ) : (
            <Botao variante="discreto" tamanho="md" largo onClick={aoFechar}>
              Cancelar
            </Botao>
          )}
        </div>
      </div>
    </FolhaInferior>
  );
}

export function ResumoCardapio({
  categorias,
  plano,
}: {
  categorias: CategoriaComPratos[];
  plano: Plano;
}) {
  const total = categorias.reduce((s, c) => s + c.itens.length, 0);
  const esgotados = categorias.reduce(
    (s, c) => s + c.itens.filter((i) => !i.disponivel).length,
    0,
  );
  const limite = LIMITES_PLANO[plano].pratos;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Distintivo tom="linha">
        {total} {total === 1 ? 'prato' : 'pratos'}
        {Number.isFinite(limite) ? ` de ${limite}` : ''}
      </Distintivo>
      <Distintivo tom="linha">{categorias.length} categorias</Distintivo>
      {esgotados > 0 ? <Distintivo tom="laranja">{esgotados} esgotados</Distintivo> : null}
    </div>
  );
}

/**
 * A promoção de um prato: o preço de promoção e, se se quiser, quando
 * começa e quando acaba. Sem datas, dura até se tirar. Com fim, acaba
 * sozinha — o dono não tem de se lembrar de a desligar.
 */
function SeccaoPromocao({
  dados,
  aoMudar,
}: {
  dados: Rascunho;
  aoMudar: (m: Partial<Rascunho>) => void;
}) {
  const preco = Number(String(dados.preco).replace(',', '.')) || 0;
  const promo = Number(dados.preco_promocional.replace(',', '.'));
  const temPromo = dados.preco_promocional.trim() !== '';
  const valida = temPromo && Number.isFinite(promo) && promo >= 0 && promo < preco;
  const desconto = valida && preco > 0 ? Math.round((1 - promo / preco) * 100) : 0;

  return (
    <fieldset className="rounded-cartao border border-linha px-4 py-3.5">
      <legend className="px-1 font-sans text-sm font-semibold text-creme">Promoção</legend>

      <div className="flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <Rotulo htmlFor="preco-promo">Preço de promoção</Rotulo>
          <Campo
            id="preco-promo"
            inputMode="decimal"
            value={dados.preco_promocional}
            onChange={(e) => aoMudar({ preco_promocional: e.target.value.replace(/[^\d.,]/g, '') })}
            placeholder="Sem promoção"
          />
        </div>
        {valida && desconto > 0 ? (
          <span className="mb-3 shrink-0 rounded-full bg-laranja px-2.5 py-1 font-sans text-sm font-bold text-creme">
            -{desconto}%
          </span>
        ) : null}
      </div>

      {temPromo && !valida ? (
        <p className="mt-2 font-sans text-xs text-[#ff8a78]">
          Tem de ser menor do que o preço normal ({formatarKz(preco)}). Assim não fica guardada.
        </p>
      ) : null}

      {temPromo ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="promo-inicio">Começa</Rotulo>
            <Campo
              id="promo-inicio"
              type="datetime-local"
              value={dados.promo_inicio}
              onChange={(e) => aoMudar({ promo_inicio: e.target.value })}
            />
          </div>
          <div>
            <Rotulo htmlFor="promo-fim">Acaba</Rotulo>
            <Campo
              id="promo-fim"
              type="datetime-local"
              value={dados.promo_fim}
              onChange={(e) => aoMudar({ promo_fim: e.target.value })}
            />
          </div>
          <p className="font-sans text-xs text-tenue sm:col-span-2">
            Hora de Luanda. Sem data de início, começa já; sem fim, dura até a tirar.
          </p>
        </div>
      ) : (
        <p className="mt-2 font-sans text-xs text-tenue">
          O cardápio mostra o preço antigo riscado e o desconto ao lado.
        </p>
      )}
    </fieldset>
  );
}

/**
 * O prato em inglês. Os campos ficam sempre editáveis: a tradução
 * automática é um ponto de partida, e o dono corrige o que quiser.
 */
function SeccaoIngles({
  dados,
  aoMudar,
}: {
  dados: Rascunho;
  aoMudar: (m: Partial<Rascunho>) => void;
}) {
  const [aTraduzir, iniciar] = React.useTransition();
  const [erro, setErro] = React.useState<string | null>(null);

  function traduzir() {
    setErro(null);
    iniciar(async () => {
      const r = await traduzirTextos({ textos: [dados.nome, dados.descricao] });
      if (!r.ok) return setErro(r.erro);
      const [nome_en, descricao_en] = r.traducoes;
      aoMudar({ nome_en: nome_en ?? '', descricao_en: descricao_en ?? '' });
    });
  }

  return (
    <section
      aria-labelledby="prato-ingles"
      className="rounded-cartao border border-black/[0.08] bg-black/[0.02] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="prato-ingles" className="flex items-center gap-2 font-sans text-sm font-semibold text-creme">
          <Languages className="h-4 w-4 text-laranja" aria-hidden />
          Em inglês
        </h3>
        <button
          type="button"
          onClick={traduzir}
          disabled={aTraduzir || !dados.nome.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-black/15 px-3.5 font-sans text-xs font-semibold text-creme transition-colors hover:border-laranja hover:text-laranja disabled:opacity-40"
        >
          {aTraduzir ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {aTraduzir ? 'A traduzir…' : 'Traduzir automaticamente'}
        </button>
      </div>
      <p className="mt-1 font-sans text-xs text-tenue">
        Para os clientes que escolhem EN no cardápio. Vazio, aparece o português.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <div>
          <Rotulo htmlFor="nome-prato-en">Nome em inglês</Rotulo>
          <Campo
            id="nome-prato-en"
            value={dados.nome_en}
            maxLength={80}
            onChange={(e) => aoMudar({ nome_en: e.target.value })}
            placeholder="Chicken Muamba"
          />
        </div>
        <div>
          <Rotulo htmlFor="desc-prato-en">Descrição em inglês</Rotulo>
          <AreaTexto
            id="desc-prato-en"
            rows={2}
            maxLength={200}
            value={dados.descricao_en}
            onChange={(e) => aoMudar({ descricao_en: e.target.value })}
            placeholder="Free-range chicken, palm oil, okra and funge"
          />
        </div>
      </div>

      {erro ? <Erro>{erro}</Erro> : null}
    </section>
  );
}

/**
 * Traduz o que ainda não tem inglês, de uma vez. O que o dono já
 * escreveu à mão não se toca.
 */
function TraduzirTudo({ demonstracao }: { demonstracao: boolean }) {
  const [aTraduzir, iniciar] = React.useTransition();
  const [aviso, setAviso] = React.useState<{ texto: string; ok: boolean } | null>(null);

  function traduzir() {
    setAviso(null);
    iniciar(async () => {
      const r = await traduzirCardapioTodo();
      if (!r.ok) return setAviso({ texto: r.erro, ok: false });
      if (r.traduzidos === 0) {
        return setAviso({ texto: 'Já está tudo em inglês. Nada por traduzir.', ok: true });
      }
      setAviso({
        texto: `${r.traduzidos} ${r.traduzidos === 1 ? 'texto traduzido' : 'textos traduzidos'}. A recarregar…`,
        ok: true,
      });
      // Os campos em inglês vivem no estado do ecrã: recarregar mostra-os.
      window.setTimeout(() => window.location.reload(), 900);
    });
  }

  return (
    <section className="superficie mt-4 flex flex-wrap items-center gap-3 rounded-cartao p-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-laranja/15 text-laranja">
        <Languages className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg text-creme">Cardápio em inglês</h2>
        <p className="font-sans text-xs leading-normal text-tenue">
          Os clientes escolhem PT ou EN no cardápio. Traduza o que falta — os nomes angolanos ficam como são — e corrija à mão o que quiser.
        </p>
      </div>
      <Botao
        variante="contorno"
        tamanho="md"
        aCarregar={aTraduzir}
        disabled={demonstracao}
        onClick={traduzir}
        className="w-full sm:w-auto"
      >
        Traduzir o que falta
      </Botao>
      {aviso ? (
        <p
          role={aviso.ok ? 'status' : 'alert'}
          className={cn('w-full font-sans text-sm', aviso.ok ? 'text-verde' : 'text-[#ff8a78]')}
        >
          {aviso.texto}
        </p>
      ) : null}
    </section>
  );
}
