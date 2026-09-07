/**
 * Formatacao monetaria de Angola.
 * O separador de milhares e o ponto e o decimal a virgula: "9.000 Kz".
 * Os centimos so aparecem quando existem de facto.
 */
export function formatarKz(valor: number, opcoes?: { comSufixo?: boolean }) {
  const comSufixo = opcoes?.comSufixo ?? true;
  const arredondado = Math.round((Number(valor) || 0) * 100) / 100;
  const negativo = arredondado < 0;
  const absoluto = Math.abs(arredondado);

  const inteiro = Math.trunc(absoluto);
  const centimos = Math.round((absoluto - inteiro) * 100);

  let texto = String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (centimos > 0) texto += ',' + String(centimos).padStart(2, '0');
  if (negativo) texto = '-' + texto;

  return comSufixo ? `${texto} Kz` : texto;
}

/** Hora local de Luanda no formato 19:42. */
export function horaLuanda(data: Date = new Date()) {
  return new Intl.DateTimeFormat('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Luanda',
  }).format(data);
}

/** Numero da mesa com dois digitos: 7 -> "07". */
export function numeroMesa(numero: number) {
  return String(numero).padStart(2, '0');
}

/**
 * Normaliza um numero de telefone angolano para o formato 244XXXXXXXXX.
 * Aceita "+244 923 456 789", "923456789", "00244923456789".
 */
export function normalizarWhatsApp(entrada: string) {
  let digitos = (entrada || '').replace(/\D/g, '');
  if (digitos.startsWith('00244')) digitos = digitos.slice(2);
  if (digitos.length === 9 && /^9/.test(digitos)) digitos = '244' + digitos;
  return digitos;
}

/** Um numero valido tem 244 seguido de 9 digitos comecados por 9. */
export function whatsAppValido(entrada: string) {
  return /^2449\d{8}$/.test(normalizarWhatsApp(entrada));
}

/** Mostra o numero de forma legivel: +244 923 456 789 */
export function mostrarWhatsApp(entrada: string) {
  const d = normalizarWhatsApp(entrada);
  if (!/^244\d{9}$/.test(d)) return entrada;
  return `+244 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
}
