// Sign-in and sign-up rules over the Spring auth API. Opening the session and
// redirecting are left to the page, so these functions can be tested alone.
//
// The server checks the password, trims and lower-cases the e-mail and enforces the
// field rules; this module only maps the answer onto error classes the page knows.
// Both functions resolve with { id, nome, email, token }: the token goes into the
// session, because the order calls need it (AD-019). Registration answers no token,
// so cadastrar signs in right after creating the account.
import { cadastrarNoServidor, entrarNoServidor } from '../api/auth.js';
import { ErroApi } from '../api/cliente.js';

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

/** The server rejected one or more fields; `campos` maps a field name to its message. */
export class DadosInvalidos extends Error {
    constructor(campos) {
        super('Dados inválidos.');
        this.name = 'DadosInvalidos';
        this.campos = campos;
    }
}

/** A 400 whose body lists at least one field becomes DadosInvalidos; any other ErroApi is returned as is. */
function interpretar400(erro) {
    const campos = erro.corpo?.campos;
    if (erro.status === 400 && campos && typeof campos === 'object' && Object.keys(campos).length > 0) {
        return new DadosInvalidos(campos);
    }
    return erro;
}

function usuarioDe({ id, nome, email }) {
    return { id, nome, email };
}

/** Resolves with the user and token, or rejects with CredenciaisInvalidas, DadosInvalidos or ErroApi. */
export async function entrar(email, senha) {
    try {
        const { token, usuario } = await entrarNoServidor({ email, senha });
        return { ...usuarioDe(usuario), token };
    } catch (erro) {
        if (!(erro instanceof ErroApi)) throw erro;
        if (erro.status === 401) throw new CredenciaisInvalidas();
        throw interpretar400(erro);
    }
}

/**
 * Creates the account, then signs in with the same e-mail and password to get a token.
 * Resolves with the created user and token, or rejects with EmailEmUso, DadosInvalidos or ErroApi.
 * A failure of the sign-in step is an ErroApi: the account exists, so the page reports a
 * communication problem rather than a field error.
 */
export async function cadastrar({ nome, email, senha }) {
    let criado;
    try {
        criado = usuarioDe(await cadastrarNoServidor({ nome, email, senha }));
    } catch (erro) {
        if (!(erro instanceof ErroApi)) throw erro;
        if (erro.status === 409) throw new EmailEmUso();
        throw interpretar400(erro);
    }
    const { token } = await entrarNoServidor({ email, senha });
    return { ...criado, token };
}
