// Entry module for index.html: fills the home carousel with the catalogue, newest first.
import { listarPresets } from '../api/presets.js';
import { criarCartao, ordenarMaisRecentes } from '../ui/cartao.js';
import { atualizarCabecalho } from '../ui/cabecalho.js';
import { carregarComEstado } from '../ui/estado.js';

const carrossel = document.querySelector('.carrossel');

atualizarCabecalho();

carregarComEstado({
    alvo: document.querySelector('.estado-carga'),
    buscar: listarPresets,
    aoCarregar(catalogo) {
        carrossel.replaceChildren(...ordenarMaisRecentes(catalogo).map(criarCartao));
    },
    // Same wording as packs.html (spec assumption table).
    mensagens: {
        carregando: 'Carregando presets...',
        erro: 'Não foi possível carregar os presets. Verifique sua conexão e tente novamente.',
    },
});
