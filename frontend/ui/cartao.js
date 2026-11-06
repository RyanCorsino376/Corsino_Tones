// Shared card builders and default order, used by every page that lists packs.
import { formatarPreco } from './formato.js';

/** Card of one pack view (servicos/catalogo.js): name (style and model), preset count, price. */
export function criarCartaoPack(pack) {
    const cartao = document.createElement('a');
    cartao.className = 'cartao';
    cartao.href = `pack.html?id=${encodeURIComponent(pack.id)}`;

    const nome = document.createElement('h2');
    nome.className = 'cartao-nome';
    nome.textContent = pack.nome;

    const quantidade = document.createElement('p');
    quantidade.className = 'cartao-quantidade';
    quantidade.textContent = pack.presets.length === 1 ? '1 preset' : `${pack.presets.length} presets`;

    const preco = document.createElement('p');
    preco.className = 'cartao-preco';
    preco.textContent = formatarPreco(pack.precoCentavos);

    cartao.append(nome, quantidade, preco);
    return cartao;
}

// Copies before sorting: Array.prototype.sort mutates, and the catalogue is shared.
export function ordenarMaisRecentes(lista) {
    // ISO dates (YYYY-MM-DD) compare correctly as plain strings.
    return [...lista].sort((a, b) => b.data.localeCompare(a.data));
}
