import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

/**
 * A chapa das imagens de partilha.
 *
 * Isto conta mais do que parece: a distribuição do Cardapp vai ser toda
 * por WhatsApp, e o que a pessoa vê antes de tocar no link é este
 * rectângulo. Preto da marca à esquerda com a palavra em serifa, e a
 * fotografia à direita a cortar ao meio.
 */

export const TAMANHO_OG = { width: 1200, height: 630 };

/**
 * JPEG e não PNG: o PNG desta chapa dava 815 kB, e o WhatsApp deixa de
 * gerar pré-visualização acima de mais ou menos 600 kB — que é
 * precisamente o sítio onde este cartão tem de funcionar.
 */
export const TIPO_OG = 'image/jpeg';

const PRETO = '#0B0B0B';
const CREME = '#F5F1EA';
const OURO = '#C9A227';
const TENUE = '#A39C92';

async function ficheiro(...partes: string[]) {
  return readFile(join(process.cwd(), ...partes));
}

/** O satori precisa da fonte em buffer; não sabe ir buscá-la ao CSS. */
async function fonteDisplay() {
  return ficheiro('src', 'app', '_fontes', 'InstrumentSerif-Regular.ttf');
}

/**
 * `foto` pode ser um endereço absoluto (uma foto no Storage do
 * restaurante) ou nada, e nesse caso usa-se a chapa da casa.
 */
export async function imagemDePartilha({
  titulo,
  subtitulo,
  etiqueta,
  foto,
}: {
  titulo: string;
  subtitulo: string;
  etiqueta?: string;
  foto?: string | null;
}) {
  const [fonte, chapa, simbolo] = await Promise.all([
    fonteDisplay(),
    ficheiro('public', 'og', 'prato.jpg'),
    ficheiro('public', 'simbolo.png'),
  ]);

  const simboloUrl = `data:image/png;base64,${simbolo.toString('base64')}`;

  const usarRemota = typeof foto === 'string' && /^https:\/\//.test(foto);
  const fundoFoto = usarRemota
    ? foto!
    : `data:image/jpeg;base64,${chapa.toString('base64')}`;

  const png = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: PRETO,
          fontFamily: 'Instrument Serif',
        }}
      >
        {/* metade esquerda: a palavra */}
        <div
          style={{
            width: 640,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px 56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={simboloUrl} width={32} height={32} alt="" />
            <span style={{ fontSize: 34, color: CREME, letterSpacing: -0.5 }}>Cardapp</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {etiqueta ? (
              <span
                style={{
                  fontSize: 19,
                  color: OURO,
                  letterSpacing: 3.4,
                  textTransform: 'uppercase',
                  marginBottom: 20,
                }}
              >
                {etiqueta}
              </span>
            ) : null}

            <span style={{ fontSize: 68, color: CREME, lineHeight: 1.04, letterSpacing: -1.5 }}>
              {titulo}
            </span>

            <span style={{ fontSize: 25, color: TENUE, lineHeight: 1.45, marginTop: 22 }}>
              {subtitulo}
            </span>
          </div>

          <span style={{ fontSize: 19, color: TENUE }}>Luanda, Angola</span>
        </div>

        {/* metade direita: a fotografia, com o preto a esbater a junta */}
        <div style={{ display: 'flex', position: 'relative', width: 560, height: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fundoFoto} width={560} height={630} style={{ objectFit: 'cover' }} alt="" />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, ${PRETO} 0%, rgba(11,11,11,0.35) 26%, rgba(11,11,11,0) 62%)`,
            }}
          />
        </div>
      </div>
    ),
    {
      ...TAMANHO_OG,
      fonts: [{ name: 'Instrument Serif', data: fonte, style: 'normal', weight: 400 }],
    },
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': TIPO_OG,
      // O cartão de partilha muda pouco e é pedido por robôs.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
