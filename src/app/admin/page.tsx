import { TabelaContas } from '@/components/admin/tabela-contas';
import { Barras, Cartao, LinhaDoTempo, Numero } from '@/components/admin/graficos';
import { COR_ESTADO } from '@/lib/cores';
import { LivroDeAuditoria } from '@/components/admin/livro-de-auditoria';
import { metricasAdmin, resumoAdministrativo, type ContaAdmin } from '@/lib/admin';
import { PLANOS, estadoDaConta, type EstadoConta } from '@/lib/planos';
import { formatarKz } from '@/lib/format';
import { NOME_PLANO, type Plano } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

/** Considera-se a usar agora quem bateu nos últimos dez minutos. */
const JANELA_ONLINE = 10 * 60 * 1000;

function estaOnline(conta: ContaAdmin) {
  if (!conta.vistoEm) return false;
  return Date.now() - new Date(conta.vistoEm).getTime() < JANELA_ONLINE;
}

const ROTULO_ESTADO: Record<EstadoConta, string> = {
  activa: 'Activas',
  a_expirar: 'A acabar (7 dias)',
  cortesia: 'Em cortesia',
  expirada: 'Fora do ar',
};

/** Estado tem cor de estado, e nunca cor sozinha — o rótulo vai ao lado. */
const TOM_ESTADO: Record<EstadoConta, string> = {
  activa: COR_ESTADO.bom,
  a_expirar: COR_ESTADO.aviso,
  cortesia: COR_ESTADO.serio,
  expirada: COR_ESTADO.critico,
};

export default async function PaginaAdmin() {
  const [{ contas, totalPedidos30Dias, semServico }, { serie, auditoria }] = await Promise.all([
    resumoAdministrativo(),
    metricasAdmin(30),
  ]);

  if (semServico) {
    return (
      <div className="vidro rounded-cartao px-7 py-14 text-center">
        <p className="font-display text-2xl text-creme">Falta a chave de serviço.</p>
        <p className="mx-auto mt-3 max-w-[52ch] font-sans text-sm leading-normal text-tenue">
          Este painel lê contas de todos os donos, coisa que a RLS não deixa ninguém fazer — e ainda
          bem. Precisa de <code className="font-mono text-creme">SUPABASE_SERVICE_ROLE_KEY</code> no
          ambiente, a mesma que está em Supabase → Project Settings → API.
        </p>
        <p className="mx-auto mt-4 max-w-[52ch] font-sans text-xs text-tenue">
          Nunca com prefixo <code className="font-mono">NEXT_PUBLIC_</code>: essa chave passa por
          cima de toda a segurança e não pode chegar ao browser.
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* As contas                                                         */
  /* ---------------------------------------------------------------- */
  const online = contas.filter(estaOnline);

  const porEstado = new Map<EstadoConta, number>();
  for (const conta of contas) {
    const e = estadoDaConta(conta.acessoExpiraEm);
    porEstado.set(e, (porEstado.get(e) ?? 0) + 1);
  }

  /*
   * Receita ao mês: só as casas que estão de facto a pagar.
   *
   * Contar as que estão em experiência daria um número bonito e falso —
   * e um número falso num painel é pior do que número nenhum, porque se
   * decide com base nele.
   */
  const aPagar = contas.filter(
    (c) => c.activo && estadoDaConta(c.acessoExpiraEm) !== 'expirada' && c.pagoAte,
  );
  const receita = aPagar.reduce((s, c) => s + PLANOS[c.plano].preco, 0);

  const pedidosHoje = serie.length ? serie[serie.length - 1].total : 0;

  const porPlano = new Map<Plano, number>();
  for (const conta of contas) porPlano.set(conta.plano, (porPlano.get(conta.plano) ?? 0) + 1);

  /* As que mais trabalham, para se saber quem sustenta isto. */
  const topCasas = [...contas]
    .filter((c) => c.pedidos30Dias > 0)
    .sort((a, b) => b.pedidos30Dias - a.pedidos30Dias)
    .slice(0, 6)
    .map((c) => ({ rotulo: c.nome, valor: c.pedidos30Dias }));

  /* Quem sumiu: sem batida há mais de sete dias, ou nunca abriu o painel. */
  const sumidas = [...contas]
    .filter((c) => c.activo)
    .filter((c) => !c.vistoEm || Date.now() - new Date(c.vistoEm).getTime() > 7 * 86_400_000)
    .sort((a, b) => {
      const va = a.vistoEm ? new Date(a.vistoEm).getTime() : 0;
      const vb = b.vistoEm ? new Date(b.vistoEm).getTime() : 0;
      return va - vb;
    })
    .slice(0, 6);

  return (
    <div>
      <div className="border-b border-linha pb-7">
        <h1 className="font-display text-3xl leading-tight text-creme md:text-4xl">
          O Cardapp por dentro
        </h1>
        <p className="mt-2 max-w-[58ch] font-sans text-sm leading-normal text-tenue">
          Todas as casas, o que pagam, quem está a trabalhar agora e quem deixou de aparecer.
        </p>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Os números que se lêem de relance                             */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero
          rotulo="Casas"
          valor={String(contas.length)}
          nota={`${contas.filter((c) => c.activo).length} no ar`}
        />
        <Numero
          rotulo="A trabalhar agora"
          valor={String(online.length)}
          nota={quemEsta(online.map((c) => c.nome))}
          tom={online.length ? 'bom' : undefined}
        />
        <Numero
          rotulo="Receita ao mês"
          valor={formatarKz(receita)}
          nota={`${aPagar.length} ${aPagar.length === 1 ? 'casa a pagar' : 'casas a pagar'}`}
        />
        <Numero
          rotulo="Pedidos hoje"
          valor={String(pedidosHoje)}
          nota={`${totalPedidos30Dias} em 30 dias`}
        />
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Gráficos                                                      */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Cartao
          titulo="Pedidos por dia"
          descricao="Últimos 30 dias, à hora de Luanda."
        >
          <LinhaDoTempo pontos={serie} />
        </Cartao>

        <Cartao titulo="Estado das contas" descricao="Onde está cada casa no prazo que pagou.">
          <Barras
            dados={(['activa', 'a_expirar', 'cortesia', 'expirada'] as EstadoConta[]).map((e) => ({
              rotulo: ROTULO_ESTADO[e],
              valor: porEstado.get(e) ?? 0,
              cor: TOM_ESTADO[e],
            }))}
          />
        </Cartao>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Casas com mais pedidos" descricao="Nos últimos 30 dias.">
          <Barras dados={topCasas} />
        </Cartao>

        <Cartao
          titulo="Quem deixou de aparecer"
          descricao="Sem abrir o painel há mais de uma semana. É o primeiro sinal de quem se vai embora — e o único que chega a tempo."
        >
          {sumidas.length ? (
            <ul className="flex flex-col gap-3">
              {sumidas.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-sans text-sm text-creme">{c.nome}</span>
                  <span className="shrink-0 font-sans text-xs text-tenue">
                    {c.vistoEm ? quandoFoi(c.vistoEm) : 'nunca abriu o painel'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-cartao border border-linha px-5 py-8 text-center font-sans text-sm text-tenue">
              Toda a gente apareceu esta semana.
            </p>
          )}
        </Cartao>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Por plano                                                     */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-4">
        <Cartao titulo="Por plano" descricao="Quantas casas em cada um, e o que rendem se pagarem.">
          <Barras
            dados={(['mesa', 'sala'] as Plano[]).map((p) => ({
              rotulo: NOME_PLANO[p],
              valor: porPlano.get(p) ?? 0,
              nota: `· ${formatarKz(PLANOS[p].preco)}/mês`,
            }))}
            sufixo="casas"
          />
        </Cartao>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* O livro                                                       */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-4">
        <LivroDeAuditoria linhas={auditoria} />
      </div>

      {/* ------------------------------------------------------------ */}
      {/* As contas, uma a uma                                          */}
      {/* ------------------------------------------------------------ */}
      <div className="mt-10 border-t border-linha pt-8">
        <h2 className="font-display text-2xl text-creme">Contas</h2>
        <p className="mt-1.5 max-w-[58ch] font-sans text-sm leading-normal text-tenue">
          Desligar tira o cardápio do ar sem apagar nada — é reversível, ao contrário de apagar, que
          aqui não existe de propósito.
        </p>
        <div className="mt-6">
          <TabelaContas contas={contas} />
        </div>
      </div>
    </div>
  );
}

/**
 * Quem está a trabalhar agora, sem cortar um nome a meio.
 *
 * Cortar a lista aos 40 caracteres dava "Tamariz do Mussulo, Cantinho da
 * Avó, Chi" — e um nome truncado a meio lê-se como coisa partida, e não
 * como lista que continua.
 */
function quemEsta(nomes: string[]) {
  if (!nomes.length) return 'ninguém';
  if (nomes.length <= 2) return nomes.join(' e ');
  return `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2}`;
}

function quandoFoi(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias < 1) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
}
