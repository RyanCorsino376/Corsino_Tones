// Shared card builder and default order, used by every page that lists presets.
import { ROTULOS } from './formato.js';

export function criarCartao(preset) {
    const cartao = document.createElement('a');
    cartao.className = 'cartao';
    cartao.href = 'preset.html';

    const nome = document.createElement('h2');
    nome.className = 'cartao-nome';
    nome.textContent = preset.nome;

    const equipamento = document.createElement('p');
    equipamento.className = 'cartao-equipamento';
    equipamento.textContent = ROTULOS.marca[preset.marca] + ' · ' + preset.equipamento;

    const estilo = document.createElement('p');
    estilo.className = 'cartao-estilo';
    estilo.textContent = ROTULOS.estilo[preset.estilo];

    cartao.append(nome, equipamento, estilo);
    return cartao;
}

// Copies before sorting: Array.prototype.sort mutates, and the catalogue is shared.
export function ordenarMaisRecentes(lista) {
    // ISO dates (YYYY-MM-DD) compare correctly as plain strings.
    return [...lista].sort((a, b) => b.data.localeCompare(a.data));
}
