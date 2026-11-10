// Order endpoints. An order never carries card data (etapa05-checkout PAY-04).
import { ErroApi, registrarErro, requisicao } from './cliente.js';

/** POST /pedidos. Resolves with the created order (the server adds the id). */
export function criarPedido(pedido) {
    return requisicao('/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
    });
}

/**
 * GET /pedidos?usuarioId={id}&status=pago: the paid orders of one user.
 * Rejects with ErroApi if the body is not a list.
 */
export async function listarPedidosPagos(usuarioId) {
    const caminho = `/pedidos?usuarioId=${encodeURIComponent(usuarioId)}&status=pago`;
    const dados = await requisicao(caminho);
    if (!Array.isArray(dados)) {
        const erro = new ErroApi(200, 'A resposta de /pedidos não é uma lista.');
        registrarErro('GET', caminho, erro);
        throw erro;
    }
    return dados;
}
