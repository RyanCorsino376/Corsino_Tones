// Users endpoints. Pure HTTP: no normalisation and no password rules here,
// those live in servicos/auth.js.
import { ErroApi, registrarErro, requisicao } from './cliente.js';

/** GET /usuarios?email=. Resolves with the user, or null when there is none. */
export async function buscarUsuarioPorEmail(email) {
    const caminho = `/usuarios?email=${encodeURIComponent(email)}`;
    const dados = await requisicao(caminho);
    if (!Array.isArray(dados)) {
        const erro = new ErroApi(200, 'A resposta de /usuarios não é uma lista.');
        registrarErro('GET', caminho, erro);
        throw erro;
    }
    return dados[0] ?? null;
}

/** POST /usuarios. Resolves with the created record (the server adds the id). */
export function criarUsuario({ nome, email, senha }) {
    return requisicao('/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
    });
}
