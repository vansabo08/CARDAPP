/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig = {
  // O gerador das imagens de partilha le estes ficheiros em tempo de
  // execucao; sem isto, o tracing da Vercel nao os leva no pacote.
  outputFileTracingIncludes: {
    '/opengraph-image': ['./src/app/_fontes/**', './public/og/**', './public/simbolo.png'],
    '/[slug]/opengraph-image': ['./src/app/_fontes/**', './public/og/**'],
  },
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
        : []),
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],

    /*
     * As qualidades que o site pede, declaradas.
     *
     * A fotografia de ambiente da pagina inicial vai a 55 — e um fundo
     * atras de texto, nao e para se estudar. Ate ao Next 15 bastava pedir;
     * a partir do 16 uma qualidade que nao esteja nesta lista deixa de ser
     * servida, e o aviso ja aparece hoje em cada pedido.
     */
    qualities: [55, 75],
  },
};

export default nextConfig;
