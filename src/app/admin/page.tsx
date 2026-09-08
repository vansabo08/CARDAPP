import { TabelaContas } from '@/components/admin/tabela-contas';
import { resumoAdministrativo } from '@/lib/admin';
import { NOME_PLANO, type Plano } from '@/lib/tipos';

export default async function PaginaAdmin() {
  const { contas, totalPedidos30Dias, semServico } = await resumoAdministrativo();

  if (semServico) {
    return (
      <div className="vidro rounded-cartao px-7 py-14 text-center">
        <p className="font-display text-[24px] text-creme">Falta a chave de serviço.</p>
        <p className="mx-auto mt-3 max-w-[52ch] font-sans text-[15px] leading-[1.6] text-tenue">
          Este painel lê contas de todos os donos, coisa que a RLS não deixa ninguém fazer — e ainda
          bem. Precisa de <code className="font-mono text-creme">SUPABASE_SERVICE_ROLE_KEY</code> no
          ambiente, a mesma que está em Supabase → Project Settings → API.
        </p>
        <p className="mx-auto mt-4 max-w-[52ch] font-sans text-[13.5px] text-tenue">
          Nunca com prefixo <code className="font-mono">NEXT_PUBLIC_</code>: essa chave passa por
          cima de toda a segurança e não pode chegar ao browser.
        </p>
      </div>
    );
  }

  const activos = contas.filter((c) => c.activo).length;
  const porPlano = new Map<Plano, number>();
  for (const conta of contas) porPlano.set(conta.plano, (porPlano.get(conta.plano) ?? 0) + 1);

  return (
    <div>
      <div className="border-b border-linha pb-7">
        <h1 className="font-display text-[32px] leading-tight text-creme md:text-[38px]">
          Contas
        </h1>
        <p className="mt-2 max-w-[58ch] font-sans text-[15px] leading-[1.6] text-tenue">
          Todos os restaurantes do Cardapp. Desligar tira o cardápio do ar sem apagar nada — é
          reversível, ao contrário de apagar, que aqui não existe de propósito.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao rotulo="Restaurantes" valor={String(contas.length)} />
        <Cartao rotulo="No ar" valor={`${activos} de ${contas.length}`} />
        <Cartao rotulo="Pedidos (30 dias)" valor={String(totalPedidos30Dias)} />
        <Cartao
          rotulo="Por plano"
          valor={
            (['balcao', 'mesa', 'sala'] as Plano[])
              .map((p) => `${porPlano.get(p) ?? 0} ${NOME_PLANO[p]}`)
              .join(' · ') || '—'
          }
          pequeno
        />
      </div>

      <div className="mt-10">
        <TabelaContas contas={contas} />
      </div>
    </div>
  );
}

function Cartao({
  rotulo,
  valor,
  pequeno = false,
}: {
  rotulo: string;
  valor: string;
  pequeno?: boolean;
}) {
  return (
    <div className="vidro-leve rounded-cartao px-5 py-6">
      <p className="etiqueta text-tenue">{rotulo}</p>
      <p
        className={
          pequeno
            ? 'mt-2.5 font-sans text-[14px] leading-snug text-creme'
            : 'mt-2.5 font-sans text-[24px] font-bold tracking-[-0.02em] text-creme'
        }
      >
        {valor}
      </p>
    </div>
  );
}
