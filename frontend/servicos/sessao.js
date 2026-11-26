// Browser session of the signed-in user. The only module that touches
// sessionStorage (AD-009). It ends when the tab closes or on "Sair".
// It also keeps the login token, which every /pedidos call needs (AD-019).
import { ErroApi } from '../api/cliente.js';

export const CHAVE = 'corsino:sessao';

// Page names only ("biblioteca.html"), optionally with a pack id ("pack.html?id=rock-zoom-g6"):
// no slashes, scheme or "..", so ?voltar= can never send the visitor to another site (open redirect).
const PAGINA_INTERNA = /^[a-z0-9-]+\.html(\?id=[a-z0-9-]+)?$/;

/** Stores id, nome, email and the login token. The password is never written to the browser. */
export function abrirSessao({ id, nome, email, token }) {
    sessionStorage.setItem(CHAVE, JSON.stringify({ id, nome, email, token }));
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

/** The token of the open session, or null when signed out or when the session has none. */
export function tokenAtual() {
    const token = usuarioAtual()?.token;
    return typeof token === 'string' ? token : null;
}

/** True when the server rejected the token (401): the page must end the session and ask for a new login. */
export function sessaoExpirada(erro) {
    return erro instanceof ErroApi && erro.status === 401;
}

export function encerrarSessao() {
    sessionStorage.removeItem(CHAVE);
}

/** The token was rejected: ends the session and sends the visitor to sign in again, then back to `pagina`. */
export function pedirNovoLogin(pagina) {
    encerrarSessao();
    location.replace(`login.html?voltar=${encodeURIComponent(destinoSeguro(pagina))}`);
}

/** `voltar` if it names a page of this site, otherwise the home page. */
export function destinoSeguro(voltar) {
    return typeof voltar === 'string' && PAGINA_INTERNA.test(voltar) ? voltar : 'index.html';
}
