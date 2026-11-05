// Loading and error states for any request a page makes. The request arrives
// as a function, so this module never imports the API layer (AD-009).

/**
 * Shows `mensagens.carregando` in `alvo` while `buscar()` runs, then clears it
 * and hands the result to `aoCarregar`. If `buscar()` rejects, shows
 * `mensagens.erro` with a "Tentar novamente" button that starts over.
 * Never rejects: every failure ends in the error state.
 */
export async function carregarComEstado(opcoes) {
    const { alvo, buscar, aoCarregar, mensagens } = opcoes;

    const aviso = document.createElement('p');
    aviso.setAttribute('role', 'status');
    aviso.textContent = mensagens.carregando;
    alvo.replaceChildren(aviso);

    let dados;
    try {
        dados = await buscar();
    } catch {
        // The API layer already logged the cause; the visitor gets one message and a way out.
        // replaceChildren swaps the old node, so repeated failures never stack messages.
        alvo.replaceChildren(criarErro(mensagens.erro, () => carregarComEstado(opcoes)));
        return;
    }
    alvo.replaceChildren();
    aoCarregar(dados);
}

function criarErro(mensagem, tentarDeNovo) {
    const caixa = document.createElement('div');
    caixa.setAttribute('role', 'alert');

    const texto = document.createElement('p');
    texto.textContent = mensagem;

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao-tentar';
    botao.textContent = 'Tentar novamente';
    botao.addEventListener('click', tentarDeNovo);

    caixa.append(texto, botao);
    return caixa;
}
