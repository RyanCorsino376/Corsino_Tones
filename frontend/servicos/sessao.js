// Browser session of the signed-in user. The only module that touches
// sessionStorage (AD-009). It ends when the tab closes or on "Sair".
export const CHAVE = 'corsino:sessao';

// Page names only ("biblioteca.html"): no slashes, scheme or "..", so
// ?voltar= can never send the visitor to another site (open redirect).
const PAGINA_INTERNA = /^[a-z0-9-]+\.html$/;

/** Stores id, nome and email. The password is never written to the browser. */
export function abrirSessao({ id, nome, email }) {
    sessionStorage.setItem(CHAVE, JSON.stringify({ id, nome, email }));
}

/** The signed-in user, or null. A corrupt value is removed and counts as signed out. */
export function usuarioAtual() {
    const texto = sessionStorage.getItem(CHAVE);
    if (texto === null) return null;
    try {
        const sessao = JSON.parse(texto);
        if (typeof sessao?.nome === 'string') return sessao;
    } catch {
        // Falls through to removal below.
    }
    sessionStorage.removeItem(CHAVE);
    return null;
}

export function encerrarSessao() {
    sessionStorage.removeItem(CHAVE);
}

/** `voltar` if it names a page of this site, otherwise the home page. */
export function destinoSeguro(voltar) {
    return typeof voltar === 'string' && PAGINA_INTERNA.test(voltar) ? voltar : 'index.html';
}
