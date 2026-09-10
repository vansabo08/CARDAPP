'use client';

import * as React from 'react';
import Link from 'next/link';
import { comprovativosPendentes } from '@/app/admin/accoes';
import { avisarDoComprovativo, ligarSomAoPrimeiroGesto, tocarSino } from '@/lib/som';

/**
 * O sino de quem administra: toca quando entra um comprovativo.
 *
 * Monta-se no painel inteiro e não no ecrã de administração, porque
 * ninguém fica sentado no ecrã de administração à espera. O aviso tem de
 * apanhar quem está a mexer no cardápio, como o sino dos pedidos.
 *
 * PORQUÊ PERGUNTAR EM VEZ DE SUBSCREVER. O Realtime do Supabase respeita
 * a RLS, e a RLS dos comprovativos só deixa passar o dono da casa. Quem
 * administra não é dono de casa nenhuma, e a lista de administradores
 * vive no ambiente — onde uma política da base de dados não lhe chega.
 * Uma pergunta por minuto resolve o mesmo, e um comprovativo não é um
 * pedido de mesa: ninguém está de pé à espera.
 *
 * E NÃO INSISTE. O sino dos pedidos volta a tocar de quatro em quatro
 * segundos porque um pedido esquecido é um cliente à espera. Aqui toca
 * uma vez por comprovativo novo: quem transferiu já tem o painel aberto
 * a título provisório, e não está a perder nada enquanto espera.
 */

/** De quanto em quanto tempo se pergunta. */
const INTERVALO = 60_000;

export function SinoDeComprovativos() {
  const vistos = React.useRef<Set<string>>(new Set());
  const primeiraVolta = React.useRef(true);
  const [quantos, setQuantos] = React.useState(0);

  React.useEffect(() => {
    // O som precisa de um gesto antes de poder tocar. Qualquer clique no
    // painel serve — não se obriga ninguém a procurar um botão.
    const desligar = ligarSomAoPrimeiroGesto(() => {});
    return desligar;
  }, []);

  React.useEffect(() => {
    let vivo = true;

    async function perguntar() {
      // Com o separador atrás de outro não se pergunta: o browser
      // atrasa os temporizadores à vontade dele e a resposta chegaria
      // fora de horas de qualquer maneira.
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const { quantos: agora, ultimo } = await comprovativosPendentes();
        if (!vivo) return;

        setQuantos(agora);

        /*
         * Na primeira volta só se aprende o que já lá estava. Sem isto,
         * abrir o painel de manhã tocava por comprovativos da véspera —
         * e um alarme que toca por coisas velhas deixa de se ouvir.
         */
        if (primeiraVolta.current) {
          primeiraVolta.current = false;
          if (ultimo) vistos.current.add(ultimo);
          return;
        }

        if (ultimo && !vistos.current.has(ultimo)) {
          vistos.current.add(ultimo);
          void tocarSino();
          avisarDoComprovativo(agora);
        }
      } catch {
        /* falhou a pergunta: tenta-se outra vez daqui a um minuto */
      }
    }

    void perguntar();
    const relogio = setInterval(perguntar, INTERVALO);

    // Ao voltar ao separador pergunta-se já, em vez de esperar pelo
    // próximo minuto.
    const aoVoltar = () => {
      if (!document.hidden) void perguntar();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      vivo = false;
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  if (!quantos) return null;

  return (
    <Link
      href="/admin"
      className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-ouro px-4 py-2.5 font-sans text-sm font-semibold text-grafite shadow-elevacao-2 transition-transform hover:-translate-y-px md:bottom-8"
    >
      {quantos === 1 ? '1 comprovativo à espera' : `${quantos} comprovativos à espera`}
    </Link>
  );
}
