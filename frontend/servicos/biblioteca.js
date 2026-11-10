// The library is derived from paid orders (plan D4): no table of its own, so
// the order and the library can never disagree.
import { listarPedidosPagos } from '../api/pedidos.js';
import { carregarCatalogo } from './catalogo.js';

// Most recent order first; orders made at the same instant fall back to the id.
function maisRecentePrimeiro(a, b) {
    if (a.criadoEm === b.criadoEm) return b.id - a.id;
    return a.criadoEm < b.criadoEm ? 1 : -1;
}

/**
 * The catalogue packs of the paid orders: newest order first, the packs of one
 * order in the order of its `packIds`, each pack once (at its newest position).
 * A pack id the catalogue does not know is dropped.
 */
export function packsDaBiblioteca(pedidos, catalogo) {
    const porId = new Map(catalogo.map((pack) => [pack.id, pack]));
    const vistos = new Set();
    const resultado = [];
    for (const pedido of [...pedidos].sort(maisRecentePrimeiro)) {
        for (const id of pedido.packIds) {
            if (vistos.has(id)) continue;
            vistos.add(id);
            const pack = porId.get(id);
            if (pack) resultado.push(pack);
        }
    }
    return resultado;
}

/** Reads the user's paid orders and the catalogue together, then joins them. */
export async function carregarBiblioteca(usuarioId) {
    const [pedidos, catalogo] = await Promise.all([listarPedidosPagos(usuarioId), carregarCatalogo()]);
    return packsDaBiblioteca(pedidos, catalogo);
}

/** Ids of the packs the user bought. Reads only the orders (pack.html needs no catalogue). */
export async function idsComprados(usuarioId) {
    const pedidos = await listarPedidosPagos(usuarioId);
    return new Set(pedidos.flatMap((pedido) => pedido.packIds));
}
