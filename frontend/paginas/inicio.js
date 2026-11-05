// Entry module for index.html: fills the home carousel with the catalogue, newest first.
import { listarPresets } from '../api/presets.js';
import { criarCartao, ordenarMaisRecentes } from '../ui/cartao.js';

const carrossel = document.querySelector('.carrossel');

async function carregar() {
    const catalogo = await listarPresets();
    carrossel.replaceChildren(...ordenarMaisRecentes(catalogo).map(criarCartao));
}

carregar();
