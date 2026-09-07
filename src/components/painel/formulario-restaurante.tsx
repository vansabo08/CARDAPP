'use client';

import * as React from 'react';
import { Ajuda, Campo, Erro, Rotulo } from '@/components/ui/campo';
import { mostrarWhatsApp, normalizarWhatsApp, whatsAppValido } from '@/lib/format';
import { enviarImagem } from '@/lib/armazenamento';
import { slugify } from '@/lib/utils';
import { SITE_URL } from '@/lib/supabase/config';

export type ValoresRestaurante = {
  nome: string;
  slug: string;
  whatsapp: string;
  logo_url: string | null;
  cor_marca: string;
};

const CORES = ['#C9A227', '#B4522D', '#2F6F4E', '#3B5B8C', '#8A4A6B', '#7A6A52'];

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
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-linha font-display text-[17px]"
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
              className="block w-full font-sans text-[13px] text-tenue file:mr-3 file:rounded-[10px] file:border file:border-linha file:bg-transparent file:px-3 file:py-2 file:font-sans file:text-[13px] file:text-creme"
            />
            <Ajuda>{aEnviar ? 'A enviar…' : 'Opcional. Sem logo usamos as iniciais.'}</Ajuda>
          </div>
        </div>
        {erroFoto ? <Erro>{erroFoto}</Erro> : null}
      </div>

      <div>
        <Rotulo htmlFor="slug">Endereço do cardápio</Rotulo>
        <div className="flex items-center gap-0 rounded-[12px] border border-linha px-3.5 focus-within:border-ouro">
          <span className="shrink-0 font-sans text-[14px] text-tenue">
            {SITE_URL.replace(/^https?:\/\//, '')}/
          </span>
          <input
            id="slug"
            value={valores.slug}
            onChange={(e) => aoMudar({ slug: slugify(e.target.value) })}
            className="h-11 min-w-0 flex-1 border-none bg-transparent font-sans text-[15px] text-creme outline-none"
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
      <div className="flex items-center gap-0 rounded-[12px] border border-linha px-3.5 focus-within:border-ouro">
        <span className="shrink-0 font-sans text-[15px] text-tenue">+244</span>
        <input
          id="whatsapp"
          inputMode="tel"
          autoComplete="tel"
          value={valor}
          onChange={(e) => aoMudar(e.target.value.replace(/[^\d\s+]/g, ''))}
          placeholder="923 456 789"
          className="h-11 min-w-0 flex-1 border-none bg-transparent pl-2 font-sans text-[15px] text-creme outline-none"
        />
        {valido ? <span className="shrink-0 text-[14px] text-verde">✓</span> : null}
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
