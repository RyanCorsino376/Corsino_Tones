// Entry module for index.html: fills the home carousel with the packs, newest first.
import { carregarCatalogo } from '../servicos/catalogo.js';
import { atualizarCabecalho } from '../ui/cabecalho.js';
import { criarCartaoPack, ordenarMaisRecentes } from '../ui/cartao.js';
import { carregarComEstado } from '../ui/estado.js';

const carrossel = document.querySelector('.carrossel');

atualizarCabecalho();

carregarComEstado({
    alvo: document.querySelector('.estado-carga'),
    buscar: carregarCatalogo,
    aoCarregar(packs) {
        carrossel.replaceChildren(...ordenarMaisRecentes(packs).map(criarCartaoPack));
    },
    // Same wording as packs.html (spec assumption table).
    mensagens: {
        carregando: 'Carregando packs...',
        erro: 'Não foi possível carregar os packs. Verifique sua conexão e tente novamente.',
    },
});
