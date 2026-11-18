// The only module that performs HTTP (AD-009). Every failure, whatever its
// cause, reaches the caller as one ErroApi, so pages handle a single error type.

// The one place to change when the Spring Boot API replaces json-server (AD-008).
export const BASE_URL = 'http://127.0.0.1:3000';

// The Spring Boot API (AD-012). Calls that pass { servidor: 'spring' } go here; the
// rest still go to the mock until their slice moves over.
export const SPRING_URL = 'http://127.0.0.1:8081';

// Without a limit, a server that accepts the connection but never answers
// would leave the page in its loading state forever.
export const TEMPO_LIMITE_MS = 8000;

export class ErroApi extends Error {
    /**
     * @param {number} status HTTP status, or 0 when no response arrived (network error, timeout)
     * @param {string} mensagem
     * @param {unknown} [causa] the original error, kept for debugging
     * @param {unknown} [corpo] parsed JSON body of a non-2xx answer, or null when it had none
     */
    constructor(status, mensagem, causa, corpo = null) {
        super(mensagem, { cause: causa });
        this.name = 'ErroApi';
        this.status = status;
        this.corpo = corpo;
    }
}

/** Writes the real cause to the console; the page only shows a friendly message. */
export function registrarErro(metodo, caminho, erro) {
    console.error(`[api] ${metodo} ${caminho} falhou:`, erro);
}

/**
 * Sends a request to the API and resolves with the parsed JSON body.
 * Rejects with ErroApi on network error, timeout, non-2xx status or invalid JSON.
 */
export async function requisicao(caminho, opcoes = {}) {
    const { servidor, ...opcoesFetch } = opcoes;
    const base = servidor === 'spring' ? SPRING_URL : BASE_URL;
    const metodo = opcoes.method ?? 'GET';
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    let resposta;
    try {
        resposta = await fetch(base + caminho, { ...opcoesFetch, signal: controle.signal });
        // fetch only rejects when no response arrives; 404 and 500 resolve normally.
        if (!resposta.ok) {
            throw new ErroApi(resposta.status, `O servidor respondeu ${resposta.status}.`, undefined, await lerCorpo(resposta));
        }
        return await resposta.json();
    } catch (erro) {
        const erroApi = classificar(erro, controle.signal.aborted, resposta);
        registrarErro(metodo, caminho, erroApi);
        throw erroApi;
    } finally {
        clearTimeout(limite);
    }
}

/** The JSON body of an error answer, or null when it has none (the status alone then tells what happened). */
async function lerCorpo(resposta) {
    try {
        return await resposta.json();
    } catch {
        return null;
    }
}

function classificar(erro, abortado, resposta) {
    if (erro instanceof ErroApi) return erro;
    if (abortado) return new ErroApi(0, `Sem resposta em ${TEMPO_LIMITE_MS} ms.`, erro);
    // A response arrived, so the failure was reading its body as JSON.
    if (resposta) return new ErroApi(resposta.status, 'A resposta não é um JSON válido.', erro);
    return new ErroApi(0, 'Não foi possível conectar ao servidor.', erro);
}
