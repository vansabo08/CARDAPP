'use client';

import * as React from 'react';
import { Botao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Erro } from '@/components/ui/campo';
import {
  CampoWhatsApp,
  CamposIdentidade,
  type ValoresRestaurante,
} from '@/components/painel/formulario-restaurante';
import { formatarKz } from '@/lib/format';
import { NOME_PLANO, type Plano, type Restaurante } from '@/lib/tipos';
import { guardarRestaurante } from '@/app/painel/definicoes/accoes';

const PLANOS: { id: Plano; preco: string; linhas: string[] }[] = [
  { id: 'balcao', preco: 'Grátis', linhas: ['1 mesa', '15 pratos', 'Marca Cardapp visível'] },
  {
    id: 'mesa',
    preco: `${formatarKz(9900)}/mês`,
    linhas: ['Mesas ilimitadas', 'Pratos ilimitados', 'Logo próprio'],
  },
  {
    id: 'sala',
    preco: `${formatarKz(19900)}/mês`,
    linhas: ['Tudo do plano Mesa', 'Estatísticas', 'Sem marca Cardapp'],
  },
];

export function EditorDefinicoes({
  restaurante,
  demonstracao,
}: {
  restaurante: Restaurante;
  demonstracao: boolean;
}) {
  const [valores, setValores] = React.useState<ValoresRestaurante>({
    nome: restaurante.nome,
    slug: restaurante.slug,
    whatsapp: restaurante.whatsapp.replace(/^244/, ''),
    logo_url: restaurante.logo_url,
    cor_marca: restaurante.cor_marca || '#C9A227',
  });
  const [estado, setEstado] = React.useState<'parado' | 'a-guardar' | 'guardado'>('parado');
  const [erro, setErro] = React.useState<string | null>(null);

  function mudar(parcial: Partial<ValoresRestaurante>) {
    setValores((v) => ({ ...v, ...parcial }));
    setEstado('parado');
  }

  async function guardar() {
    setEstado('a-guardar');
    setErro(null);

    const resultado = await guardarRestaurante(valores);

    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Não foi possível guardar.');
      setEstado('parado');
      return;
    }

    if (resultado.slug) setValores((v) => ({ ...v, slug: resultado.slug! }));
    setEstado('guardado');
  }

  return (
    <div className="mt-9 flex flex-col gap-12">
      <section>
        <h2 className="font-display text-[21px] text-creme">O restaurante</h2>
        <div className="mt-5 max-w-[460px]">
          <CamposIdentidade valores={valores} aoMudar={mudar} slugAutomatico={false} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-[21px] text-creme">Para onde vão os pedidos</h2>
        <div className="mt-5 max-w-[460px]">
          <CampoWhatsApp valor={valores.whatsapp} aoMudar={(v) => mudar({ whatsapp: v })} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-linha pt-7">
        <Botao variante="ouro" tamanho="md" onClick={guardar} disabled={estado === 'a-guardar'}>
          {estado === 'a-guardar' ? 'A guardar…' : 'Guardar alterações'}
        </Botao>
        {estado === 'guardado' ? (
          <span className="font-sans text-[13.5px] text-verde">
            {demonstracao ? 'Guardado (modo demonstração).' : 'Guardado.'}
          </span>
        ) : null}
        {erro ? <Erro className="mt-0">{erro}</Erro> : null}
      </div>

      <section id="plano" className="scroll-mt-24 border-t border-linha pt-12">
        <h2 className="font-display text-[21px] text-creme">Plano</h2>
        <p className="mt-2 max-w-[54ch] font-sans text-[14.5px] leading-[1.6] text-tenue">
          A mudança de plano é combinada connosco enquanto o pagamento por Multicaixa Express e
          AppyPay não estiver ligado.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PLANOS.map((plano) => {
            const actual = plano.id === restaurante.plano;
            return (
              <div
                key={plano.id}
                className={`rounded-[12px] border p-5 ${
                  actual ? 'border-ouro/45 bg-ouro/[0.04]' : 'border-linha bg-grafite-alto'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-[19px] text-creme">{NOME_PLANO[plano.id]}</h3>
                  {actual ? <Distintivo tom="ouro">Actual</Distintivo> : null}
                </div>
                <p className="mt-3 font-sans text-[15px] font-bold text-creme">{plano.preco}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {plano.linhas.map((linha) => (
                    <li key={linha} className="flex items-start gap-2.5 font-sans text-[13.5px] text-tenue">
                      <span className="mt-[7px] block h-[4px] w-[4px] shrink-0 rounded-full bg-ouro" />
                      {linha}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
