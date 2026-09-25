/**
 * O que se vê enquanto a secção seguinte vem do servidor.
 *
 * Cada página do painel lê da base de dados quando abre, e no telemóvel
 * do balcão isso é meio segundo em que não acontecia nada: carregava-se
 * em "Pedidos" e o ecrã ficava no sítio, como se o toque se tivesse
 * perdido. Quem está a trabalhar carrega outra vez.
 *
 * Com este ficheiro, o Next mostra isto no instante do toque e troca-o
 * pelo conteúdo quando ele chega. Não acelera nada — faz é o painel
 * responder, que é o que se sente.
 *
 * É o desenho da página que vem a seguir: um título, uma linha de
 * números e uma lista. Um esqueleto parecido com o que vai chegar lê-se
 * como "está a vir"; um círculo a rodar lê-se como "está encravado".
 */
export default function ACarregar() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">A carregar…</span>

      {/* o cabeçalho */}
      <div className="h-9 w-[58%] max-w-[320px] rounded-campo bg-creme/[0.07] md:h-11" />
      <div className="mt-3 h-4 w-[76%] max-w-[440px] rounded-campo bg-creme/[0.05]" />

      {/* a fila de números */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="superficie h-[104px] rounded-cartao" />
        ))}
      </div>

      {/* a lista */}
      <div className="mt-3 flex flex-col gap-3">
        {[0, 1, 2].map((n) => (
          <div key={n} className="superficie h-[88px] rounded-cartao" />
        ))}
      </div>
    </div>
  );
}
