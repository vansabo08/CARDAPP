'use client';

import * as React from 'react';
import { Botao } from '@/components/ui/botao';
import { AreaTexto, Campo, Erro, Rotulo } from '@/components/ui/campo';
import { Distintivo } from '@/components/ui/distintivo';
import { FolhaInferior } from '@/components/ui/folha-inferior';
import { Interruptor } from '@/components/ui/interruptor';
import { FotoPrato } from '@/components/prato-visual';
import { formatarKz } from '@/lib/format';
import { enviarImagem } from '@/lib/armazenamento';
import { cn } from '@/lib/utils';
import { LIMITES_PLANO, type CategoriaComPratos, type Plano, type Prato } from '@/lib/tipos';
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
};

const RASCUNHO_VAZIO = (categoryId: string): Rascunho => ({
  id: null,
  categoryId,
  nome: '',
  descricao: '',
  preco: '',
  foto_url: null,
  disponivel: true,
});

export function GestorCardapio({
  categoriasIniciais,
  plano,
  demonstracao,
}: {
  categoriasIniciais: CategoriaComPratos[];
  plano: Plano;
  demonstracao: boolean;
}) {
  const [categorias, setCategorias] = React.useState(categoriasIniciais);
  const [rascunho, setRascunho] = React.useState<Rascunho | null>(null);
  const [novaCategoria, setNovaCategoria] = React.useState('');
  const [aCriarCategoria, setACriarCategoria] = React.useState(false);
  const [arrastada, setArrastada] = React.useState<string | null>(null);

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

  async function removerCategoria(id: string) {
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
    };

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
        <p className="mt-8 rounded-[12px] border border-ouro/30 bg-ouro/[0.06] px-4 py-3 font-sans text-[13.5px] leading-[1.55] text-ouro">
          Modo de demonstração: pode mexer à vontade, mas as alterações não são gravadas enquanto o
          Supabase não estiver ligado.
        </p>
      ) : null}

      {atingiuLimite ? (
        <p className="mt-6 rounded-[12px] border border-linha bg-grafite-alto px-4 py-3 font-sans text-[13.5px] leading-[1.55] text-tenue">
          O plano Balcão vai até {limites.pratos} pratos e já lá chegou. Mude para o plano Mesa para
          continuar a acrescentar.
        </p>
      ) : null}

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
              'rounded-[12px] border border-linha bg-grafite-alto transition-opacity duration-200',
              arrastada === categoria.id && 'opacity-40',
            )}
          >
            <header className="flex items-center gap-2 border-b border-linha px-4 py-3.5">
              <span
                aria-hidden
                title="Arraste para reordenar"
                className="cursor-grab select-none px-1 text-tenue"
              >
                ⠿
              </span>

              <input
                value={categoria.nome}
                onChange={(e) => mudarNome(categoria.id, e.target.value)}
                aria-label="Nome da categoria"
                className="min-w-0 flex-1 border-none bg-transparent font-display text-[20px] text-creme outline-none focus:text-ouro"
              />

              <span className="etiqueta shrink-0 text-tenue">{categoria.itens.length}</span>

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
                <BotaoIcone rotulo="Apagar categoria" onClick={() => removerCategoria(categoria.id)}>
                  ×
                </BotaoIcone>
              </div>
            </header>

            <ul className="divide-y divide-linha">
              {categoria.itens.map((prato) => (
                <li key={prato.id} className="flex items-center gap-3.5 px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setRascunho({
                        id: prato.id,
                        categoryId: categoria.id,
                        nome: prato.nome,
                        descricao: prato.descricao ?? '',
                        preco: String(prato.preco),
                        foto_url: prato.foto_url,
                        disponivel: prato.disponivel,
                      })
                    }
                    className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
                  >
                    <span
                      className={cn(
                        'relative block h-11 w-11 shrink-0 overflow-hidden rounded-[10px]',
                        !prato.disponivel && 'opacity-40',
                      )}
                    >
                      <FotoPrato nome={prato.nome} url={prato.foto_url} tamanhos="44px" />
                    </span>
                    <span className={cn('min-w-0 flex-1', !prato.disponivel && 'opacity-45')}>
                      <span className="block truncate font-display text-[16px] text-creme">
                        {prato.nome}
                      </span>
                      {prato.descricao ? (
                        <span className="block truncate font-sans text-[12.5px] text-tenue">
                          {prato.descricao}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-sans text-[14px] font-bold text-creme',
                        !prato.disponivel && 'opacity-45',
                      )}
                    >
                      {formatarKz(prato.preco)}
                    </span>
                  </button>

                  <span className="flex shrink-0 items-center gap-2 pl-1">
                    <Interruptor
                      checked={prato.disponivel}
                      onCheckedChange={(v) => mudarDisponivel(prato.id, v)}
                      aria-label={`${prato.nome} disponível hoje`}
                    />
                  </span>
                </li>
              ))}
            </ul>

            <div className="px-4 py-3">
              <Botao
                variante="discreto"
                tamanho="sm"
                disabled={atingiuLimite}
                onClick={() => setRascunho(RASCUNHO_VAZIO(categoria.id))}
              >
                + Novo prato
              </Botao>
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
            <Botao variante="ouro" tamanho="md" onClick={adicionarCategoria}>
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
        aoFechar={() => setRascunho(null)}
        aoGravar={gravarPrato}
        aoApagar={removerPrato}
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
      className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[15px] text-tenue transition-colors duration-200 hover:bg-white/[0.06] hover:text-creme disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function FolhaPrato({
  rascunho,
  aoFechar,
  aoGravar,
  aoApagar,
}: {
  rascunho: Rascunho | null;
  aoFechar: () => void;
  aoGravar: (r: Rascunho) => void;
  aoApagar: (id: string) => void;
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
        <h2 className="font-display text-[24px] text-creme">
          {dados.id ? 'Editar prato' : 'Novo prato'}
        </h2>

        <div className="mt-6 flex items-start gap-4">
          <span className="relative block h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[12px] border border-linha">
            <FotoPrato nome={dados.nome || 'Prato'} url={dados.foto_url} tamanhos="84px" />
          </span>
          <div className="min-w-0 flex-1">
            <Rotulo htmlFor="foto">Fotografia</Rotulo>
            <input
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={escolherFoto}
              className="block w-full font-sans text-[13px] text-tenue file:mr-3 file:rounded-[10px] file:border file:border-linha file:bg-transparent file:px-3 file:py-2 file:font-sans file:text-[13px] file:text-creme"
            />
            <p className="mt-2 font-sans text-[12.5px] text-tenue">
              {aEnviar ? 'A enviar…' : 'Sem foto, o cardápio mostra uma ilustração do prato.'}
            </p>
            {dados.foto_url ? (
              <button
                type="button"
                onClick={() => setDados((d) => (d ? { ...d, foto_url: null } : d))}
                className="mt-2 font-sans text-[12.5px] text-tenue underline underline-offset-4 hover:text-creme"
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
              <p className="mt-2 font-sans text-[13px] text-tenue">
                Aparece como{' '}
                <span className="text-creme">
                  {formatarKz(Number(String(dados.preco).replace(',', '.')) || 0)}
                </span>
              </p>
            ) : null}
          </div>

          <label className="flex items-center justify-between rounded-[12px] border border-linha px-4 py-3.5">
            <span>
              <span className="block font-sans text-[14.5px] font-semibold text-creme">
                Disponível hoje
              </span>
              <span className="block font-sans text-[12.5px] text-tenue">
                Se desligar, aparece esbatido e não pode ser pedido.
              </span>
            </span>
            <Interruptor
              checked={dados.disponivel}
              onCheckedChange={(v) => setDados({ ...dados, disponivel: v })}
            />
          </label>
        </div>

        {erro ? <Erro>{erro}</Erro> : null}

        <div className="mt-7 flex flex-col gap-2.5">
          <Botao
            variante="ouro"
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
      {esgotados > 0 ? <Distintivo tom="ouro">{esgotados} esgotados</Distintivo> : null}
    </div>
  );
}
