'use client';

import * as React from 'react';
import { Botao, useSinalDeBotao } from '@/components/ui/botao';
import { Distintivo } from '@/components/ui/distintivo';
import { Erro } from '@/components/ui/campo';
import {
  CampoWhatsApp,
  CamposIdentidade,
  EscolhaDoModo,
  type ValoresRestaurante,
} from '@/components/painel/formulario-restaurante';
import { formatarKz } from '@/lib/format';
import { INCLUI, PRECO_PLANO } from '@/lib/planos';
import { NOME_PLANO, type ModoPedido, type Plano, type Restaurante } from '@/lib/tipos';
import { guardarModoPedido, guardarRestaurante } from '@/app/painel/definicoes/accoes';
import { desbloquearSom, lembrarSom } from '@/lib/som';

const PLANOS: Plano[] = ['mesa', 'sala'];

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
    capa_url: restaurante.capa_url,
    cor_marca: restaurante.cor_marca || '#D9B36B',
    modo_pedido: restaurante.modo_pedido ?? 'whatsapp',
  });
  const [estado, setEstado] = React.useState<'parado' | 'a-guardar' | 'guardado'>('parado');
  const [sinal, sinalizar] = useSinalDeBotao();
  const [erro, setErro] = React.useState<string | null>(null);
  const [modoAGravar, setModoAGravar] = React.useState(false);
  const [erroDoModo, setErroDoModo] = React.useState<string | null>(null);
  const [modoGuardado, setModoGuardado] = React.useState(false);

  // A confirmacao da via e passageira, como o visto do botao.
  React.useEffect(() => {
    if (!modoGuardado) return;
    const relogio = setTimeout(() => setModoGuardado(false), 1800);
    return () => clearTimeout(relogio);
  }, [modoGuardado]);

  function mudar(parcial: Partial<ValoresRestaurante>) {
    setValores((v) => ({ ...v, ...parcial }));
    setEstado('parado');
  }

  /**
   * A via grava-se ao clicar, sem passar pelo botão de baixo.
   *
   * Mostra-se já no ecrã e desfaz-se se a gravação falhar: o contrário —
   * esperar pela resposta antes de marcar — deixava o rádio a parecer
   * avariado durante meio segundo em ligações fracas, que é onde isto
   * vai ser usado.
   */
  async function escolherModo(modo: ModoPedido) {
    const anterior = valores.modo_pedido;
    if (modo === anterior) return;

    setValores((v) => ({ ...v, modo_pedido: modo }));

    /*
     * Este clique é um gesto do utilizador, e um gesto é exactamente o
     * que os browsers exigem para deixar tocar som. Aproveita-se: quem
     * escolhe receber pedidos dentro da aplicação sai daqui com o som
     * já desbloqueado, sem ter de encontrar outro botão.
     */
    if (modo === 'app') {
      lembrarSom(true);
      void desbloquearSom();
    } else {
      lembrarSom(false);
    }

    setModoAGravar(true);
    setErroDoModo(null);
    setModoGuardado(false);

    const resultado = await guardarModoPedido(modo);
    setModoAGravar(false);

    if (!resultado.ok) {
      setValores((v) => ({ ...v, modo_pedido: anterior }));
      setErroDoModo(resultado.erro ?? 'Não foi possível guardar a via.');
      return;
    }

    setModoGuardado(true);
  }

  async function guardar() {
    setEstado('a-guardar');
    setErro(null);

    const resultado = await guardarRestaurante(valores);

    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Não foi possível guardar.');
      setEstado('parado');
      sinalizar('erro');
      return;
    }

    if (resultado.slug) setValores((v) => ({ ...v, slug: resultado.slug! }));
    setEstado('guardado');
    sinalizar('sucesso');
  }

  return (
    <div className="mt-9 flex flex-col gap-12">
      <section>
        <h2 className="font-display text-xl text-creme">O restaurante</h2>
        <div className="mt-5 max-w-[460px]">
          <CamposIdentidade valores={valores} aoMudar={mudar} slugAutomatico={false} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-creme">Para onde vão os pedidos</h2>
        <p className="mt-2 max-w-[54ch] font-sans text-sm leading-normal text-tenue">
          Escolha como quer receber. Pode mudar de ideias a qualquer hora, e a mudança vale para o
          pedido seguinte.
        </p>

        <div className="mt-5 max-w-[560px]">
          <EscolhaDoModo
            valor={valores.modo_pedido}
            aoMudar={escolherModo}
            aGravar={modoAGravar}
            guardado={modoGuardado}
            erro={erroDoModo}
          />
        </div>

        <div className="mt-7 max-w-[460px]">
          <CampoWhatsApp valor={valores.whatsapp} aoMudar={(v) => mudar({ whatsapp: v })} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-linha pt-7">
        <Botao
          variante="ouro"
          tamanho="md"
          onClick={guardar}
          aCarregar={estado === 'a-guardar'}
          estado={sinal}
        >
          Guardar alterações
        </Botao>
        {estado === 'guardado' ? (
          <span className="font-sans text-xs text-verde">
            {demonstracao ? 'Guardado (modo demonstração).' : 'Guardado.'}
          </span>
        ) : null}
        {erro ? <Erro className="mt-0">{erro}</Erro> : null}
      </div>

      <section id="plano" className="scroll-mt-24 border-t border-linha pt-12">
        <h2 className="font-display text-xl text-creme">Plano</h2>
        <p className="mt-2 max-w-[54ch] font-sans text-sm leading-normal text-tenue">
          A mudança de plano é combinada connosco enquanto o pagamento por Multicaixa Express e
          AppyPay não estiver ligado.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PLANOS.map((plano) => {
            const actual = plano === restaurante.plano;
            return (
              <div
                key={plano}
                className={`rounded-cartao border p-5 transition-[border-color,box-shadow] duration-normal ease-assinatura ${
                  actual
                    ? 'border-ouro/45 bg-ouro/[0.04] shadow-elevacao-1-escura'
                    : 'border-linha bg-grafite-alto'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg text-creme">{NOME_PLANO[plano]}</h3>
                  {actual ? <Distintivo tom="ouro">Actual</Distintivo> : null}
                </div>
                <p className="mt-3 font-sans text-sm font-bold text-creme">
                  {formatarKz(PRECO_PLANO[plano])}
                  <span className="font-normal text-tenue">/mês</span>
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {INCLUI[plano].map((linha) => (
                    <li key={linha} className="flex items-start gap-2.5 font-sans text-xs text-tenue">
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
