// Loading and error states for any request a page makes. The request arrives
// as a function, so this module never imports the API layer (AD-009).

/**
 * Shows `mensagens.carregando` in `alvo` while `buscar()` runs, then clears it
 * and hands the result to `aoCarregar`.
 */
export async function carregarComEstado({ alvo, buscar, aoCarregar, mensagens }) {
    const aviso = document.createElement('p');
    aviso.setAttribute('role', 'status');
    aviso.textContent = mensagens.carregando;
    alvo.replaceChildren(aviso);

    const dados = await buscar();
    alvo.replaceChildren();
    aoCarregar(dados);
}
