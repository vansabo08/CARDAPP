import { formatarKz } from '../format';
import { dataPorExtenso, type ResumoDoDia } from '../resumo';

/**
 * Email do resumo diário.
 *
 * HTML de email é outro ofício: tabelas, estilos em linha e nada de
 * variáveis CSS. O fundo é creme e não grafite — o escuro é bonito no
 * ecrã mas trai-nos no Outlook e nalguns clientes em modo claro.
 * O dourado e a serifa ficam, para não deixar de ser o Cardapp.
 */

const OURO = '#A8813E';
const GRAFITE = '#0F0E0D';
const CREME = '#FAF7F2';
const TENUE = '#6B6660';
const LINHA = '#E4DED4';

const SERIFA = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type DadosResumo = {
  nomeRestaurante: string;
  data: Date;
  resumo: ResumoDoDia;
  ligacaoPainel: string;
};

export function assuntoResumo({ nomeRestaurante, data, resumo }: DadosResumo) {
  if (!resumo.pedidos) return `${nomeRestaurante} · ontem não entraram pedidos`;
  const plural = resumo.pedidos === 1 ? 'pedido' : 'pedidos';
  return `${nomeRestaurante} · ${resumo.pedidos} ${plural}, ${formatarKz(resumo.total)} — ${dataPorExtenso(data)}`;
}

function celulaNumero(rotulo: string, valor: string) {
  return `
    <td style="padding:18px 16px;background:#ffffff;border:1px solid ${LINHA};border-radius:14px;" valign="top">
      <div style="font:600 11px/1 ${SANS};letter-spacing:1.6px;text-transform:uppercase;color:${TENUE};">${rotulo}</div>
      <div style="margin-top:9px;font:700 22px/1.1 ${SANS};color:${GRAFITE};">${valor}</div>
    </td>`;
}

function linhaPrato(posicao: number, nome: string, qtd: number, valor: number, maior: number) {
  const largura = Math.max(6, Math.round((qtd / maior) * 100));
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${LINHA};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="22" style="font:400 13px/1.4 ${SANS};color:${TENUE};" valign="top">${posicao}</td>
            <td style="font:400 16px/1.4 ${SERIFA};color:${GRAFITE};">${escapar(nome)}</td>
            <td align="right" style="font:400 13px/1.4 ${SANS};color:${TENUE};white-space:nowrap;padding-left:12px;">
              ${qtd}× · ${formatarKz(valor)}
            </td>
          </tr>
          <tr>
            <td></td>
            <td colspan="2" style="padding-top:7px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:3px;background:${LINHA};border-radius:2px;">
                    <table role="presentation" width="${largura}%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="height:3px;background:${OURO};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function htmlResumo({ nomeRestaurante, data, resumo, ligacaoPainel }: DadosResumo) {
  const maior = resumo.top[0]?.qtd ?? 1;

  const corpoVazio = `
    <tr>
      <td style="padding:34px 26px;background:#ffffff;border:1px solid ${LINHA};border-radius:14px;text-align:center;">
        <div style="font:400 20px/1.3 ${SERIFA};color:${GRAFITE};">Ontem não entrou nenhum pedido.</div>
        <div style="margin-top:10px;font:400 15px/1.6 ${SANS};color:${TENUE};">
          Se a sala esteve cheia, vale a pena confirmar que os cartões com o QR continuam nas mesas.
        </div>
      </td>
    </tr>`;

  const corpoComDados = `
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${celulaNumero('Pedidos', String(resumo.pedidos))}
            <td width="12"></td>
            ${celulaNumero('Valor', formatarKz(resumo.total))}
          </tr>
          <tr><td colspan="3" height="12"></td></tr>
          <tr>
            ${celulaNumero('Itens', String(resumo.itens))}
            <td width="12"></td>
            ${celulaNumero('Média por pedido', formatarKz(resumo.media))}
          </tr>
        </table>
      </td>
    </tr>

    ${
      resumo.horaDePonta != null
        ? `<tr><td style="padding-top:18px;font:400 14px/1.6 ${SANS};color:${TENUE};">
             O movimento apertou por volta das
             <strong style="color:${GRAFITE};">${String(resumo.horaDePonta).padStart(2, '0')}h</strong>.
           </td></tr>`
        : ''
    }

    <tr><td height="30"></td></tr>
    <tr>
      <td style="font:400 19px/1.2 ${SERIFA};color:${GRAFITE};padding-bottom:6px;">
        ${resumo.top.length === 1 ? 'O mais pedido' : `Os ${resumo.top.length} mais pedidos`}
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${resumo.top
            .map((p, i) => linhaPrato(i + 1, p.nome, p.qtd, p.valor, maior))
            .join('')}
        </table>
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="pt-AO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(assuntoResumo({ nomeRestaurante, data, resumo, ligacaoPainel }))}</title>
</head>
<body style="margin:0;padding:0;background:${CREME};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  ${resumo.pedidos} pedidos, ${formatarKz(resumo.total)}. O resumo de ontem no ${escapar(nomeRestaurante)}.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREME};">
  <tr>
    <td align="center" style="padding:28px 16px 44px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

        <tr>
          <td style="background:${GRAFITE};border-radius:18px;padding:26px 24px;">
            <div style="font:400 19px/1 ${SERIFA};color:${CREME};letter-spacing:-0.3px;">
              Cardapp<span style="color:${OURO};">.</span>
            </div>
            <div style="margin-top:20px;font:600 11px/1 ${SANS};letter-spacing:1.6px;text-transform:uppercase;color:${OURO};">
              ${escapar(dataPorExtenso(data))}
            </div>
            <div style="margin-top:8px;font:400 27px/1.15 ${SERIFA};color:${CREME};">
              ${escapar(nomeRestaurante)}
            </div>
          </td>
        </tr>

        <tr><td height="22"></td></tr>

        ${resumo.pedidos ? corpoComDados : corpoVazio}

        <tr><td height="30"></td></tr>
        <tr>
          <td align="center">
            <a href="${escaparUrl(ligacaoPainel)}"
               style="display:inline-block;background:${GRAFITE};color:${CREME};text-decoration:none;
                      font:600 14px/1 ${SANS};padding:15px 28px;border-radius:999px;">
              Ver o painel
            </a>
          </td>
        </tr>

        <tr><td height="30"></td></tr>
        <tr>
          <td align="center" style="border-top:1px solid ${LINHA};padding-top:20px;font:400 12px/1.6 ${SANS};color:${TENUE};">
            Recebe isto porque tem o plano Sala no Cardapp.<br>
            Luanda, Angola
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function textoResumo({ nomeRestaurante, data, resumo, ligacaoPainel }: DadosResumo) {
  const linhas = [
    `${nomeRestaurante} — ${dataPorExtenso(data)}`,
    '',
  ];

  if (!resumo.pedidos) {
    linhas.push('Ontem não entrou nenhum pedido.');
    linhas.push('');
    linhas.push('Se a sala esteve cheia, confirme que os cartões com o QR continuam nas mesas.');
  } else {
    linhas.push(`Pedidos: ${resumo.pedidos}`);
    linhas.push(`Valor: ${formatarKz(resumo.total)}`);
    linhas.push(`Itens: ${resumo.itens}`);
    linhas.push(`Média por pedido: ${formatarKz(resumo.media)}`);
    if (resumo.horaDePonta != null) {
      linhas.push(`Hora de ponta: ${String(resumo.horaDePonta).padStart(2, '0')}h`);
    }
    linhas.push('');
    linhas.push(resumo.top.length === 1 ? 'O mais pedido:' : `Os ${resumo.top.length} mais pedidos:`);
    resumo.top.forEach((p, i) => {
      linhas.push(`  ${i + 1}. ${p.nome} — ${p.qtd}x · ${formatarKz(p.valor)}`);
    });
  }

  linhas.push('');
  linhas.push(`Painel: ${ligacaoPainel}`);
  linhas.push('');
  linhas.push('— enviado via Cardapp');

  return linhas.join('\n');
}

function escapar(valor: string) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Só deixamos passar http(s): nada de javascript: dentro de um href. */
function escaparUrl(valor: string) {
  return /^https?:\/\//i.test(valor) ? escapar(valor) : '#';
}
