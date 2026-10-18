/**
 * O navegador do usuário, para avisos que dependem dele. Pelo user agent:
 * o que importa aqui é o motor que vai abrir o arquivo, não um recurso que
 * dê para testar — o Safari codifica o vídeo, só não mostra a transparência.
 *
 * Todo navegador põe "Safari" no user agent; o Safari de verdade é o que não
 * se identifica como nenhum dos outros.
 */
export function isSafari(userAgent: string) {
  return (
    /Safari\//.test(userAgent) &&
    !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg|OPR|Firefox|Android)/.test(userAgent)
  );
}

/**
 * Copia um texto que ainda está sendo preparado. O Safari só deixa escrever na
 * área de transferência durante o clique; esperar o texto ficar pronto antes
 * de copiar perderia esse clique. Um `ClipboardItem` com uma promessa reserva
 * a cópia no clique e a completa depois — é o caminho que o Safari suporta, e
 * o Chrome e o Firefox também. Sem `ClipboardItem`, espera e copia o texto.
 */
export async function copyPendingText(text: Promise<string>) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": text.then((value) => new Blob([value], { type: "text/plain" })),
      }),
    ]);
    return;
  }

  await navigator.clipboard.writeText(await text);
}

