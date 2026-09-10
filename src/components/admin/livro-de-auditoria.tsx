import type { LinhaDeAuditoria } from '@/lib/admin';

/**
 * O livro: tudo o que um administrador fez a uma conta alheia.
 *
 * Mostra o antes e o depois lado a lado. Saber que houve uma mudança sem
 * saber de que para quê não responde à única pergunta que se faz a um
 * registo destes — "então e o que é que estava lá antes?".
 */
export function LivroDeAuditoria({ linhas }: { linhas: LinhaDeAuditoria[] }) {
  return (
    <section className="vidro rounded-cartao p-6">
      <h2 className="font-display text-xl text-creme">Auditoria</h2>
      <p className="mt-1 text-pretty font-sans text-xs leading-normal text-tenue">
        Tudo o que foi mexido em contas alheias, e por quem. Últimas 40 acções.
      </p>

      {linhas.length ? (
        <ol className="mt-5 flex flex-col divide-y divide-linha">
          {linhas.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
              <div className="min-w-0">
                <p className="font-sans text-sm text-creme">
                  {l.accao}
                  {l.restauranteNome ? (
                    <span className="text-tenue"> · {l.restauranteNome}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 font-sans text-xs text-tenue">
                  {l.quem}
                  {mudanca(l) ? <span className="text-creme"> · {mudanca(l)}</span> : null}
                </p>
              </div>
              <time
                dateTime={l.quando}
                className="shrink-0 font-sans text-xs tabular-nums text-tenue"
              >
                {quando(l.quando)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-cartao border border-linha px-5 py-8 text-center font-sans text-sm text-tenue">
          Nada mexido ainda. O livro enche-se sozinho a partir daqui.
        </p>
      )}
    </section>
  );
}

/**
 * "mesa → sala" em vez de dois objectos JSON.
 *
 * Só se mostram os campos que mudaram de facto: um registo que repete o
 * que ficou igual obriga a procurar a diferença, e quem lê isto está a
 * procurar exactamente isso.
 */
function mudanca(l: LinhaDeAuditoria): string | null {
  if (!l.antes || !l.depois) return null;

  const partes: string[] = [];
  for (const chave of Object.keys(l.depois)) {
    const de = l.antes[chave];
    const para = l.depois[chave];
    if (de === para) continue;
    partes.push(`${legivel(de)} → ${legivel(para)}`);
  }

  return partes.join(', ') || null;
}

function legivel(v: unknown): string {
  if (v === null || v === undefined) return 'nada';
  if (typeof v === 'boolean') return v ? 'ligada' : 'desligada';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: 'short',
      timeZone: 'Africa/Luanda',
    }).format(new Date(v));
  }
  return String(v);
}

function quando(iso: string) {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? 'há 1 hora' : `há ${horas} horas`;

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Luanda',
  }).format(new Date(iso));
}
