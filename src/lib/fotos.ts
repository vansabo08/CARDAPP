/**
 * As fotografias que valem por toda a página.
 *
 * Estão aqui, numa constante só, porque a mesma fotografia serve a
 * página inicial e o ecrã de entrada. Trocá-la é trocar esta linha —
 * guarda-se o ficheiro novo em `public/pratos/` e escreve-se o nome dele
 * aqui. Não é preciso andar à procura em cada ecrã onde aparece.
 *
 * O ficheiro deve ser `.webp` e não passar de uns 300 KB: é a primeira
 * coisa que carrega, num telemóvel com dados móveis à mesa.
 */

/** A sala cheia: gente a servir, e um QR em cada mesa. Página inicial. */
export const FOTO_CASA_CHEIA = '/pratos/casa-cheia.webp';

/**
 * O cartão do QR em cima da mesa, ao fim do dia. Ecrã de entrada.
 *
 * É a fotografia certa para ali: quem entra no painel vem trabalhar, e o
 * que vê por trás do cartão de entrada é exactamente aquilo que a app
 * lhe põe na mesa.
 */
export const FOTO_MESA_QR = '/pratos/mesa-qr.webp';
