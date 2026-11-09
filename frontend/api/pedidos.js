// Order endpoints. An order never carries card data (etapa05-checkout PAY-04).
import { requisicao } from './cliente.js';

/** POST /pedidos. Resolves with the created order (the server adds the id). */
export function criarPedido(pedido) {
    return requisicao('/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
    });
}
