// Spring Boot auth endpoints. Pure HTTP: no normalisation and no rules here,
// those live in servicos/auth.js and on the server (AD-009, AD-012).
import { requisicao } from './cliente.js';

function enviarJson(caminho, corpo) {
    return requisicao(caminho, {
        servidor: 'spring',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
    });
}

/** POST /auth/login. Resolves with { token, usuario: { id, nome, email } }. */
export function entrarNoServidor({ email, senha }) {
    return enviarJson('/auth/login', { email, senha });
}

/** POST /auth/cadastro. Resolves with the created user { id, nome, email }. */
export function cadastrarNoServidor({ nome, email, senha }) {
    return enviarJson('/auth/cadastro', { nome, email, senha });
}
