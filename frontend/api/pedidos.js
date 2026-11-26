// Order endpoints. An order never carries card data (etapa05-checkout PAY-04).
// Every call needs the session token: the server takes the user from it (AD-019).
import { ErroApi, registrarErro, requisicao } from './cliente.js';

/**
 * POST /pedidos with only the pack ids. The server sets the owner, prices,
 * total, status and time, and resolves with the created order.
 */
export function criarPedido(packIds, token) {
    return requisicao('/pedidos', {
        token,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packIds }),
    });
}

/**
 * GET /pedidos?status=pago: the paid orders of the signed-in user.
 * Rejects with ErroApi if the body is not a list.
 */
export async function listarPedidosPagos(token) {
    const caminho = '/pedidos?status=pago';
    const dados = await requisicao(caminho, { token });
    if (!Array.isArray(dados)) {
        const erro = new ErroApi(200, 'A resposta de /pedidos não é uma lista.');
        registrarErro('GET', caminho, erro);
        throw erro;
    }
    return dados;
}
