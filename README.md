# Cardapp

Cardápio digital para restaurantes em Angola. O restaurante carrega o cardápio,
o sistema gera um QR por mesa, o cliente lê o código, escolhe sem fazer login e
o pedido chega ao WhatsApp do restaurante já escrito e somado.

Moeda: Kwanza. Interface em português de Angola.

---

## Como correr

```bash
npm install
npm run dev
```

Abre em <http://localhost:3000>. Sem Supabase configurado a aplicação arranca em
**modo de demonstração**: todos os ecrãs funcionam com o restaurante fictício
*Tia Bela* (Muamba de Galinha, Calulu de Peixe, Mufete, Cuca 33cl…) e nada é
gravado.

Vale a pena começar por:

| Ecrã | Endereço |
| --- | --- |
| Landing | `/` |
| Cardápio público | `/tia-bela?mesa=7` |
| Painel | `/painel` |
| Onboarding | `/comecar` |

```bash
npm test
```

27 testes, com destaque para o formato exacto da mensagem de WhatsApp
(alinhamento do pontilhado, separador de milhares, observações opcionais) e para
a folha A4 de cartões de mesa.

---

## Ligar ao Supabase

1. Criar um projecto em <https://supabase.com/dashboard>.
2. No **SQL Editor**, correr `supabase/migrations/0001_esquema.sql`. Isso cria as
   tabelas, os índices, as políticas de RLS e o bucket `cardapp` do Storage.
3. Em **Authentication → Providers**, deixar *Email* ligado (email + palavra-passe).
4. Copiar `.env.example` para `.env.local` e preencher:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=https://o-seu-dominio.ao
```

`NEXT_PUBLIC_SITE_URL` é o endereço que os QR das mesas passam a apontar — mude-o
**antes** de imprimir os cartões.

5. Reiniciar o `npm run dev`. Os mesmos ecrãs passam a ler e escrever na base de
   dados, sem alterações no código.

```bash
npm run supabase:verificar
```

Confere a chave, as cinco tabelas, se a RLS recusa um pedido órfão vindo de um
anónimo, e se o bucket está de pé. Só faz leituras.

### Em produção, não te esqueças da Vercel

O `.env.local` está no `.gitignore` — **nunca sai da tua máquina**. Um deploy sem
as variáveis definidas no painel da Vercel arranca em modo de demonstração:
parece inteiro e não grava nada.

Em **Project → Settings → Environment Variables**, para *Production*, *Preview* e
*Development*:

| Variável | Onde a ir buscar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a mesma página, chave `anon public` |
| `NEXT_PUBLIC_SITE_URL` | o endereço público, sem barra no fim |

Depois de as guardar é preciso **voltar a fazer deploy** — a Vercel só as lê no
build.

Enquanto faltarem, todas as páginas que dependem da base de dados mostram uma
faixa vermelha a dizê-lo. Foi de propósito: um produto que perde pedidos tem de
o dizer em voz alta.

### Regras de acesso

- O dono lê e escreve apenas as linhas do seu `restaurant_id`.
- O público (`anon`) lê restaurantes com `activo = true` e as respectivas
  categorias, pratos e mesas.
- O público pode **inserir** pedidos e mais nada — nunca lê pedidos de ninguém.
- No Storage cada dono só escreve dentro da pasta `<uid>/`.

---

## Como está organizado

```
src/
  app/
    page.tsx                landing
    [slug]/page.tsx         cardápio público (aceita ?mesa=N)
    entrar, criar-conta     autenticação
    comecar                 onboarding em 4 passos
    painel/                 resumo, cardapio, mesas, definicoes
    api/pedidos             grava o pedido antes de abrir o WhatsApp
  components/
    cardapio/               carrinho e ecrã público
    painel/                 gestor de cardápio, mesas, definições
    ui/                     botão, campo, interruptor, folha inferior
  lib/
    whatsapp.ts             buildWhatsAppMessage — o coração do produto
    format.ts               Kwanzas, horas de Luanda, números 244
    cartoes-pdf.ts          folha A4 com 6 cartões por página
    dados.ts                leitura (Supabase ou demonstração)
supabase/migrations/        esquema e RLS
tests/                      testes unitários
```

### A mensagem de WhatsApp

`buildWhatsAppMessage` produz sempre isto, e há testes a garanti-lo:

```
🍽 NOVO PEDIDO — Mesa 07
Tia Bela · 19:42

▪️ 2x Muamba de Galinha ......... 9.000 Kz
▪️ 1x Calulu de Peixe ........... 5.500 Kz
   ↳ sem piripiri
▪️ 3x Cuca 33cl ................. 1.800 Kz

TOTAL ....................... 16.300 Kz
Pagamento: na mesa

— enviado via Cardapp
```

O pedido é gravado em `orders` com `fetch(..., { keepalive: true })` sem esperar
pela resposta, e logo a seguir abre-se o `wa.me`. Se a gravação falhar, o cliente
não fica preso: o pedido segue à mesma para o WhatsApp.

O total mostrado ao cliente é recalculado no servidor antes de gravar — o valor
enviado pelo browser é apenas indicativo.

---

## Desenho

Tokens em `src/app/globals.css`, tipografia via `next/font`.

| Token | Valor | Uso |
| --- | --- | --- |
| `--grafite` | `#0F0E0D` | preto quente, fundo da app |
| `--creme-folha` | `#FDFCFA` | folha do cardápio |
| `--ouro` | `#D9B36B` | acento e botões |
| `--ouro-claro` | `#EFD6A4` | topo do degradé dos títulos |
| `--verde` | `#0F9D58` | exclusivo do botão de WhatsApp |

Tipos: **Instrument Serif** nos títulos, no nome do restaurante e nos nomes
dos pratos — serifa de alto contraste, com um itálico que carrega a marca.
**Familjen Grotesk** na interface e nos preços. Nenhuma das duas é comum em
aplicações, que é meia batalha para não parecer um template.

Raios ao jeito da referência: folhas a 28px, cartões a 20px, campos a 14px,
controlos em pastilha.

### O fundo

Um preto liso lê-se como página morta, por isso por baixo de tudo há um
`FundoVivo`: três brasas quentes (ouro, cobre, azul frio) em gradiente
radial a derivar entre 46 e 62 segundos, grão fino, vinheta, e — só onde
existe rato — um holofote dourado que segue o cursor. É tudo CSS: os
gradientes não levam `filter: blur`, e o holofote actualiza duas variáveis
dentro de `requestAnimationFrame`. Com `prefers-reduced-motion` pára.

A faixa de nomes de pratos corre em ciclo e pára quando se lhe passa o rato
por cima.

### Os telemóveis da página inicial

`Telemovel` desenha o aparelho com as proporções a sério: ecrã 393×852,
raio a 14% da largura, ilha dinâmica de 125×36 com a lente, banda em
titânio, botões laterais nos sítios certos, reflexo do vidro e bisel.

O que está lá dentro é escrito **à resolução real** e só depois encolhido
por `transform: scale` — por isso o que se vê no mockup é o ecrã que o
cliente vê, não uma miniatura desenhada à parte.

### Fotografia

As imagens em `public/pratos` são do Unsplash, escolhidas uma a uma pelo
registo escuro e quente (ver `public/pratos/CREDITOS.md`). **Não são fotos
dos pratos angolanos a sério** — procurei-as no Wikimedia Commons, onde
existem calulus e mufetes autênticos, mas são instantâneos com flash e
toalha de mesa que destoavam por completo do resto. Quando um restaurante
carregar as suas fotografias pelo painel, estas desaparecem.

Pratos sem fotografia continuam a ter `PratoVisual`: um prato visto de
cima, desenhado em SVG inline, sempre igual para o mesmo nome e sem custar
um pedido de rede.

## Peso das páginas

Do `next build`:

| Rota | JS no primeiro carregamento |
| --- | --- |
| `/[slug]` (cardápio público) | 139 kB |
| `/` (landing) | 119 kB |
| `/painel/mesas` | 196 kB |

O cardápio público é renderizado no servidor e revalidado de hora a hora, por
isso o primeiro pixel não espera pelo JavaScript. O `jspdf` só é descarregado
quando alguém carrega em *Descarregar cartões*, e o middleware não corre em
`/[slug]`.

---

## Ainda por fazer

- Pagamentos das subscrições por AppyPay / Multicaixa Express. Por agora a
  mudança de plano é combinada fora da aplicação.
- Várias unidades por conta (previsto no plano Sala; o esquema já aguenta, falta
  o selector no painel).
- Reordenar pratos dentro de uma categoria por arrastar (as categorias já se
  arrastam; os pratos ordenam-se pelo campo `ordem`).
