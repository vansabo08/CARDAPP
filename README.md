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

Tokens em `src/app/globals.css`, tipografia via `next/font`:

| Token | Valor | Uso |
| --- | --- | --- |
| `--grafite` | `#141414` | fundo da app e da landing |
| `--creme` | `#FAF8F5` | texto sobre escuro; fundo do cardápio |
| `--ouro` | `#C9A227` | único acento de marca |
| `--verde` | `#0F9D58` | exclusivo do botão de WhatsApp |
| `--linha` | `rgba(250,248,245,.12)` | separadores |

Fraunces nos títulos e nomes de pratos, Manrope na interface e nos preços. Raio
de 12px, sem gradientes berrantes nem sombras pesadas. Animação única: fade +
8px de subida, 240 ms, `ease-out`, desligada com `prefers-reduced-motion`.

Pratos sem fotografia não mostram um vazio: `PratoVisual` desenha em SVG inline
um prato visto de cima, sempre igual para o mesmo nome e sem custar um pedido de
rede.

---

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
