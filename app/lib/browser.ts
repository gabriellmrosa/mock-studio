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
