// Sign-in and sign-up rules over the users API. Opening the session and
// redirecting are left to the page, so these functions can be tested alone.
//
// Mock-only weakness: the password is compared in the browser against the
// record the API returns. With Spring Boot the server checks it (plano.md).
import { buscarUsuarioPorEmail, criarUsuario } from '../api/usuarios.js';

export class CredenciaisInvalidas extends Error {
    constructor() {
        super('E-mail ou senha incorretos.');
        this.name = 'CredenciaisInvalidas';
    }
}

export class EmailEmUso extends Error {
    constructor() {
        super('Este e-mail já está cadastrado.');
        this.name = 'EmailEmUso';
    }
}

/** "  Ryan@Exemplo.com " and "ryan@exemplo.com" are the same account. */
export function normalizarEmail(email) {
    return email.trim().toLowerCase();
}

/** Resolves with the user, or rejects with CredenciaisInvalidas (or ErroApi on communication failure). */
export async function entrar(email, senha) {
    const usuario = await buscarUsuarioPorEmail(normalizarEmail(email));
    // Same error for both cases: telling them apart reveals which e-mails exist.
    if (!usuario || usuario.senha !== senha) throw new CredenciaisInvalidas();
    return usuario;
}

/** Creates the account, or rejects with EmailEmUso before sending anything. */
export async function cadastrar({ nome, email, senha }) {
    const emailNormalizado = normalizarEmail(email);
    if (await buscarUsuarioPorEmail(emailNormalizado)) throw new EmailEmUso();
    return criarUsuario({ nome: nome.trim(), email: emailNormalizado, senha });
}
