'use client';

import * as React from 'react';
import { Ajuda, Campo, Erro, Rotulo } from '@/components/ui/campo';
import { mostrarWhatsApp, normalizarWhatsApp, whatsAppValido } from '@/lib/format';
import { enviarImagem } from '@/lib/armazenamento';
import { slugify } from '@/lib/utils';
import { SITE_URL } from '@/lib/supabase/config';
import type { ModoPedido } from '@/lib/tipos';

export type ValoresRestaurante = {
  nome: string;
  slug: string;
  whatsapp: string;
  logo_url: string | null;
  capa_url: string | null;
  cor_marca: string;
  modo_pedido: ModoPedido;
};

/**
 * Como é que a casa quer receber os pedidos.
 *
 * A ordem importa: o WhatsApp está primeiro por ser o que já funciona e
 * o que a casa reconhece. Quem quiser o acompanhamento dentro da
 * aplicação escolhe-o, em vez de ser mudado sem pedir.
 */
export const MODOS: { id: ModoPedido; titulo: string; texto: string }[] = [
  {
    id: 'whatsapp',
    titulo: 'Pelo WhatsApp',
    texto:
      'O cliente carrega e a conversa abre com o pedido já escrito. É como sempre funcionou, e não exige nada de novo a ninguém.',
  },
  {
    id: 'app',
    titulo: 'Dentro do Cardapp',
    texto:
      'O pedido cai no painel, o aparelho toca, e o cliente fica com uma página que mostra o estado a mudar. Exige alguém de olho no painel durante o serviço.',
  },
];

export function EscolhaDoModo({
  valor,
  aoMudar,
}: {
  valor: ModoPedido;
  aoMudar: (v: ModoPedido) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="sr-only">Como recebe os pedidos</legend>

      {MODOS.map((modo) => {
        const escolhido = modo.id === valor;
        return (
          <label
            key={modo.id}
            className={`flex cursor-pointer gap-3.5 rounded-cartao border p-4 transition-colors duration-200 ease-calmo ${
              escolhido ? 'border-ouro/55 bg-ouro/[0.06]' : 'border-linha hover:border-creme/25'
            }`}
          >
            <input
              type="radio"
              name="modo_pedido"
              value={modo.id}
              checked={escolhido}
              onChange={() => aoMudar(modo.id)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#C9A227]"
            />
            <span className="min-w-0">
              <span className="block font-sans text-sm font-semibold text-creme">
                {modo.titulo}
              </span>
              <span className="mt-1 block text-pretty font-sans text-xs leading-normal text-tenue">
                {modo.texto}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

const CORES = ['#D9B36B', '#C2703C', '#2F6F4E', '#3B5B8C', '#8A4A6B', '#8C6A4A'];

/* --------------------------- nome, logo, slug --------------------------- */

export function CamposIdentidade({
  valores,
  aoMudar,
  slugAutomatico,
}: {
  valores: ValoresRestaurante;
  aoMudar: (v: Partial<ValoresRestaurante>) => void;
  slugAutomatico: boolean;
}) {
  const [aEnviar, setAEnviar] = React.useState(false);
  const [erroFoto, setErroFoto] = React.useState<string | null>(null);

  async function escolherLogo(evento: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;

    setAEnviar(true);
    setErroFoto(null);
    const resultado = await enviarImagem(ficheiro, 'logos');
    setAEnviar(false);

    if (!resultado.ok) return setErroFoto(resultado.erro);
    if (resultado.demonstracao) return setErroFoto('Sem Supabase ligado não há onde guardar o logo.');
    aoMudar({ logo_url: resultado.url });
  }

  const iniciais = (valores.nome || 'R')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Rotulo htmlFor="nome-restaurante">Nome do restaurante</Rotulo>
        <Campo
          id="nome-restaurante"
          value={valores.nome}
          maxLength={80}
          onChange={(e) => {
            const nome = e.target.value;
            aoMudar(slugAutomatico ? { nome, slug: slugify(nome) } : { nome });
          }}
          placeholder="Tia Bela"
        />
      </div>

      <div>
        <Rotulo>Logótipo</Rotulo>
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-linha font-display text-base"
            style={{ color: valores.cor_marca }}
          >
            {valores.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={valores.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              iniciais
            )}
          </span>
          <div className="min-w-0 flex-1">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={escolherLogo}
              aria-label="Escolher logótipo"
              className="block w-full font-sans text-xs text-tenue file:mr-3 file:rounded-campo file:border file:border-linha file:bg-transparent file:px-3 file:py-2 file:font-sans file:text-xs file:text-creme"
            />
            <Ajuda>{aEnviar ? 'A enviar…' : 'Opcional. Sem logo usamos as iniciais.'}</Ajuda>
          </div>
        </div>
        {erroFoto ? <Erro>{erroFoto}</Erro> : null}
      </div>

      <CampoCapa valor={valores.capa_url} aoMudar={(capa_url) => aoMudar({ capa_url })} />

      <div>
        <Rotulo htmlFor="slug">Endereço do cardápio</Rotulo>
        <div className="flex items-center gap-0 rounded-campo border border-linha px-3.5 focus-within:border-ouro">
          <span className="shrink-0 font-sans text-sm text-tenue">
            {SITE_URL.replace(/^https?:\/\//, '')}/
          </span>
          <input
            id="slug"
            value={valores.slug}
            onChange={(e) => aoMudar({ slug: slugify(e.target.value) })}
            className="h-11 min-w-0 flex-1 border-none bg-transparent font-sans text-sm text-creme outline-none"
            placeholder="tia-bela"
          />
        </div>
        <Ajuda>É este o endereço que os QR das mesas vão abrir.</Ajuda>
      </div>

      <div>
        <Rotulo>Cor da marca</Rotulo>
        <div className="flex flex-wrap items-center gap-2">
          {CORES.map((cor) => (
            <button
              key={cor}
              type="button"
              aria-label={`Cor ${cor}`}
              onClick={() => aoMudar({ cor_marca: cor })}
              style={{ backgroundColor: cor }}
              className={`h-9 w-9 rounded-full transition-transform duration-200 ease-calmo ${
                valores.cor_marca === cor ? 'scale-100 ring-2 ring-creme ring-offset-2 ring-offset-grafite' : 'scale-90'
              }`}
            />
          ))}
        </div>
        <Ajuda>Usada no distintivo da mesa, no cardápio público.</Ajuda>
      </div>
    </div>
  );
}

/* --------------------------------- capa --------------------------------- */

/**
 * Fotografia de capa do cardápio.
 *
 * Antes o topo do cardápio ia buscar a primeira foto de prato que
 * encontrasse — mudava sozinho quando o dono reordenava os pratos.
 * Agora é escolha dele, e a pré-visualização mostra a proporção real
 * com que vai aparecer.
 */
function CampoCapa({
  valor,
  aoMudar,
}: {
  valor: string | null;
  aoMudar: (url: string | null) => void;
}) {
  const [aEnviar, setAEnviar] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function escolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;

    setAEnviar(true);
    setErro(null);
    const resultado = await enviarImagem(ficheiro, 'capas');
    setAEnviar(false);

    if (!resultado.ok) return setErro(resultado.erro);
    if (resultado.demonstracao) return setErro('Sem Supabase ligado não há onde guardar a capa.');
    aoMudar(resultado.url);
  }

  return (
    <div>
      <Rotulo>Fotografia de capa</Rotulo>

      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-cartao border border-linha bg-grafite-alto">
        {valor ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={valor} alt="" className="h-full w-full object-cover" />
            {/* o mesmo véu do cardápio, para se ver como fica com texto */}
            <div className="veu-foto absolute inset-0" />
            <span className="absolute bottom-3 left-4 font-display text-lg text-creme">
              O seu restaurante
            </span>
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <span className="font-sans text-xs leading-normal text-tenue">
              Sem capa, o cardápio usa a primeira fotografia de prato.
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={escolher}
          aria-label="Escolher fotografia de capa"
          className="block font-sans text-xs text-tenue file:mr-3 file:rounded-campo file:border file:border-linha file:bg-transparent file:px-3 file:py-2 file:font-sans file:text-xs file:text-creme"
        />
        {valor ? (
          <button
            type="button"
            onClick={() => aoMudar(null)}
            className="font-sans text-xs text-tenue underline underline-offset-4 transition-colors hover:text-creme"
          >
            Remover capa
          </button>
        ) : null}
      </div>

      <Ajuda>
        {aEnviar ? 'A enviar…' : 'Larga e escura resulta melhor — o nome fica por cima dela.'}
      </Ajuda>
      {erro ? <Erro>{erro}</Erro> : null}
    </div>
  );
}

/* ------------------------------- whatsapp ------------------------------- */

export function CampoWhatsApp({
  valor,
  aoMudar,
}: {
  valor: string;
  aoMudar: (v: string) => void;
}) {
  const digitos = normalizarWhatsApp(valor);
  const valido = whatsAppValido(valor);
  const comecou = digitos.length > 3;

  return (
    <div>
      <Rotulo htmlFor="whatsapp">Número de WhatsApp</Rotulo>
      <div className="flex items-center gap-0 rounded-campo border border-linha px-3.5 focus-within:border-ouro">
        <span className="shrink-0 font-sans text-sm text-tenue">+244</span>
        <input
          id="whatsapp"
          inputMode="tel"
          autoComplete="tel"
          value={valor}
          onChange={(e) => aoMudar(e.target.value.replace(/[^\d\s+]/g, ''))}
          placeholder="923 456 789"
          className="h-11 min-w-0 flex-1 border-none bg-transparent pl-2 font-sans text-sm text-creme outline-none"
        />
        {valido ? <span className="shrink-0 text-sm text-verde">✓</span> : null}
      </div>

      {valido ? (
        <Ajuda className="text-verde">Os pedidos chegam a {mostrarWhatsApp(valor)}.</Ajuda>
      ) : comecou ? (
        <Erro>O número tem de ser 244 seguido de nove dígitos, a começar por 9.</Erro>
      ) : (
        <Ajuda>É para aqui que os pedidos são enviados. Escreva sem o indicativo.</Ajuda>
      )}
    </div>
  );
}
