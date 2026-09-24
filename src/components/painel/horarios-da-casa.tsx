'use client';

import * as React from 'react';
import { Clock3, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Botao } from '@/components/ui/botao';
import { Campo, Rotulo } from '@/components/ui/campo';
import { apagarMenu, guardarMenu, mudarModoEsgotado } from '@/app/painel/cardapio/accoes-sala';
import { descreverDias, horaCurta, menuActivo } from '@/lib/horarios';
import type { MenuHorario } from '@/lib/tipos';
import { cn } from '@/lib/utils';

/**
 * Os horários da casa e o que fazer ao esgotado.
 *
 * Fica no topo do cardápio porque é a pergunta que vem antes dos pratos:
 * "quando é que isto aparece?". Um horário diz os dias e as horas; cada
 * categoria escolhe o seu no próprio cabeçalho. Sem horário, aparece
 * sempre — que é o que acontece a tudo até alguém criar o primeiro.
 */

const DIAS = [
  { n: 1, curto: 'S', nome: 'segunda' },
  { n: 2, curto: 'T', nome: 'terça' },
  { n: 3, curto: 'Q', nome: 'quarta' },
  { n: 4, curto: 'Q', nome: 'quinta' },
  { n: 5, curto: 'S', nome: 'sexta' },
  { n: 6, curto: 'S', nome: 'sábado' },
  { n: 0, curto: 'D', nome: 'domingo' },
];

type Rascunho = {
  id?: string;
  nome: string;
  nome_en?: string;
  hora_inicio: string;
  hora_fim: string;
  dias: number[];
};

const NOVO: Rascunho = { nome: '', hora_inicio: '12:00', hora_fim: '15:00', dias: [1, 2, 3, 4, 5] };

export function HorariosDaCasa({
  menus,
  aoMudar,
  esgotadoModo,
  podeMudarEsgotado,
  demonstracao,
  ingles = false,
}: {
  menus: MenuHorario[];
  aoMudar: (menus: MenuHorario[]) => void;
  esgotadoModo: 'mostrar' | 'esconder';
  podeMudarEsgotado: boolean;
  demonstracao: boolean;
  /** Com o cardápio em inglês, o nome do horário também tem o seu. */
  ingles?: boolean;
}) {
  const [rascunho, setRascunho] = React.useState<Rascunho | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [ocupado, iniciar] = React.useTransition();
  const [modo, setModo] = React.useState(esgotadoModo);
  const [agora, setAgora] = React.useState<number | null>(null);

  // A hora só no browser: "a servir agora" desenhado no servidor podia
  // não bater certo com o do browser, e partia a hidratação.
  React.useEffect(() => {
    setAgora(Date.now());
    const relogio = window.setInterval(() => setAgora(Date.now()), 60_000);
    return () => window.clearInterval(relogio);
  }, []);

  function gravar() {
    if (!rascunho) return;
    setErro(null);
    iniciar(async () => {
      const { nome_en, ...resto } = rascunho;
      const r = await guardarMenu(ingles ? rascunho : resto);
      if (!r.ok) return setErro(r.erro);
      const id = rascunho.id ?? r.id ?? `local-${Date.now()}`;
      const guardado: MenuHorario = { ...resto, nome_en: nome_en?.trim() || null, id, ordem: menus.length };
      aoMudar(rascunho.id ? menus.map((m) => (m.id === id ? { ...m, ...guardado } : m)) : [...menus, guardado]);
      setRascunho(null);
    });
  }

  function apagar(id: string) {
    setErro(null);
    iniciar(async () => {
      const r = await apagarMenu({ id });
      if (!r.ok) return setErro(r.erro);
      aoMudar(menus.filter((m) => m.id !== id));
    });
  }

  function trocarModo(novo: 'mostrar' | 'esconder') {
    const antes = modo;
    setModo(novo);
    iniciar(async () => {
      const r = await mudarModoEsgotado({ modo: novo });
      if (!r.ok) {
        setModo(antes);
        setErro(r.erro);
      }
    });
  }

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="superficie rounded-cartao p-5" aria-labelledby="horarios">
        <div className="flex items-center justify-between gap-3">
          <h2 id="horarios" className="flex items-center gap-2 font-display text-lg text-creme">
            <Clock3 className="h-5 w-5 text-laranja" aria-hidden />
            Horários
          </h2>
          {!rascunho ? (
            <Botao variante="contorno" tamanho="md" onClick={() => setRascunho({ ...NOVO, dias: [...NOVO.dias] })}>
              <Plus className="h-4 w-4" aria-hidden />
              Horário
            </Botao>
          ) : null}
        </div>

        {menus.length === 0 && !rascunho ? (
          <p className="mt-3 font-sans text-sm leading-normal text-tenue">
            Sem horários, o cardápio mostra tudo a toda a hora. Crie um "Almoço" das 12:00 às 15:00 e
            escolha, no cabeçalho de cada categoria, as que só aparecem nessa altura.
          </p>
        ) : null}

        <ul className="mt-3 flex flex-col gap-2">
          {menus.map((menu) => {
            const aServir = agora != null && menuActivo(menu, agora);
            return (
              <li
                key={menu.id}
                className="flex items-center gap-3 rounded-campo border border-black/[0.07] bg-black/[0.02] px-3.5 py-2.5"
              >
                <span
                  className={cn('h-2 w-2 shrink-0 rounded-full', aServir ? 'bg-verde' : 'bg-black/20')}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-sm font-semibold text-creme">
                    {menu.nome}
                    {aServir ? <span className="ml-2 font-normal text-verde">a servir</span> : null}
                  </span>
                  <span className="block font-sans text-xs text-tenue">
                    {horaCurta(menu.hora_inicio)}–{horaCurta(menu.hora_fim)} · {descreverDias(menu.dias)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setRascunho({
                      id: menu.id,
                      nome: menu.nome,
                      nome_en: menu.nome_en ?? '',
                      hora_inicio: horaCurta(menu.hora_inicio),
                      hora_fim: horaCurta(menu.hora_fim),
                      dias: [...menu.dias],
                    })
                  }
                  aria-label={`Editar ${menu.nome}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-tenue hover:bg-black/[0.06] hover:text-creme"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => apagar(menu.id)}
                  disabled={ocupado || demonstracao}
                  aria-label={`Apagar ${menu.nome}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-tenue hover:bg-black/[0.06] hover:text-creme disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        {rascunho ? (
          <div className="mt-3 rounded-cartao border border-laranja/40 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <Rotulo htmlFor="menu-nome">Nome</Rotulo>
                <Campo
                  id="menu-nome"
                  value={rascunho.nome}
                  maxLength={40}
                  onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                  placeholder="Almoço"
                  autoFocus
                />
                {ingles ? (
                  <Campo
                    value={rascunho.nome_en ?? ''}
                    maxLength={40}
                    onChange={(e) => setRascunho({ ...rascunho, nome_en: e.target.value })}
                    placeholder="Em inglês: Lunch"
                    aria-label="Nome do horário em inglês"
                    className="mt-2"
                  />
                ) : null}
              </div>
              <div>
                <Rotulo htmlFor="menu-inicio">Das</Rotulo>
                <Campo
                  id="menu-inicio"
                  type="time"
                  value={rascunho.hora_inicio}
                  onChange={(e) => setRascunho({ ...rascunho, hora_inicio: e.target.value })}
                  className="sm:w-[120px]"
                />
              </div>
              <div>
                <Rotulo htmlFor="menu-fim">Às</Rotulo>
                <Campo
                  id="menu-fim"
                  type="time"
                  value={rascunho.hora_fim}
                  onChange={(e) => setRascunho({ ...rascunho, hora_fim: e.target.value })}
                  className="sm:w-[120px]"
                />
              </div>
            </div>

            <fieldset className="mt-3">
              <legend className="mb-2 font-sans text-sm font-semibold text-creme/85">Dias</legend>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((dia) => {
                  const marcado = rascunho.dias.includes(dia.n);
                  return (
                    <label
                      key={dia.n}
                      className={cn(
                        'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border font-sans text-sm font-semibold transition-colors',
                        marcado ? 'border-laranja bg-laranja text-creme' : 'border-black/15 text-tenue hover:border-black/35',
                        'focus-within:ring-2 focus-within:ring-laranja/50',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={marcado}
                        aria-label={dia.nome}
                        onChange={() =>
                          setRascunho({
                            ...rascunho,
                            dias: marcado ? rascunho.dias.filter((d) => d !== dia.n) : [...rascunho.dias, dia.n],
                          })
                        }
                      />
                      {dia.curto}
                    </label>
                  );
                })}
              </div>
              {rascunho.hora_fim < rascunho.hora_inicio ? (
                <p className="mt-2 font-sans text-xs text-tenue">
                  Acaba depois da meia-noite: conta como a noite do dia em que começa.
                </p>
              ) : null}
            </fieldset>

            <div className="mt-4 flex flex-wrap gap-2">
              <Botao variante="laranja" tamanho="md" aCarregar={ocupado} disabled={demonstracao} onClick={gravar}>
                Guardar horário
              </Botao>
              <Botao variante="discreto" tamanho="md" onClick={() => setRascunho(null)}>
                Cancelar
              </Botao>
            </div>
          </div>
        ) : null}

        {erro ? (
          <p role="alert" className="mt-3 font-sans text-sm text-[#ff8a78]">
            {erro}
          </p>
        ) : null}
      </section>

      <section className="superficie rounded-cartao p-5" aria-labelledby="esgotado">
        <h2 id="esgotado" className="flex items-center gap-2 font-display text-lg text-creme">
          <EyeOff className="h-5 w-5 text-laranja" aria-hidden />
          Pratos esgotados
        </h2>
        <p className="mt-1 font-sans text-xs leading-normal text-tenue">
          Muda no telemóvel do cliente na hora, sem ele recarregar.
        </p>
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="O que fazer aos pratos esgotados">
          {(
            [
              ['mostrar', 'Mostrar como esgotado', 'Riscado, sem poder pedir. O cliente sabe que existe.'],
              ['esconder', 'Esconder', 'Sai do cardápio até voltar a haver.'],
            ] as const
          ).map(([valor, titulo, frase]) => (
            <label
              key={valor}
              className={cn(
                'flex min-h-[56px] cursor-pointer items-start gap-3 rounded-campo border px-3.5 py-3 transition-colors',
                modo === valor ? 'border-laranja bg-laranja/10' : 'border-black/10 hover:border-black/25',
                !podeMudarEsgotado && 'cursor-not-allowed opacity-60',
                'focus-within:ring-2 focus-within:ring-laranja/40',
              )}
            >
              <input
                type="radio"
                name="esgotado-modo"
                className="sr-only"
                checked={modo === valor}
                disabled={!podeMudarEsgotado || ocupado || demonstracao}
                onChange={() => trocarModo(valor)}
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  modo === valor ? 'border-laranja' : 'border-black/30',
                )}
              >
                {modo === valor ? <span className="h-1.5 w-1.5 rounded-full bg-laranja" /> : null}
              </span>
              <span>
                <span className="block font-sans text-sm font-semibold text-creme">{titulo}</span>
                <span className="block font-sans text-xs leading-snug text-tenue">{frase}</span>
              </span>
            </label>
          ))}
          {!podeMudarEsgotado ? (
            <p className="font-sans text-xs text-tenue">Só o dono muda esta definição.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
