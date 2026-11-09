// Entry module for pack.html?id={pack id}: one pack (one style for one
// pedalboard model), its price and the presets it includes. Presets are
// listed, not shown as cards: they are not sold alone.
import { buscarPack } from '../api/packs.js';
import { listarPresetsDoPack } from '../api/presets.js';
import { adicionarAoCarrinho, estaNoCarrinho } from '../servicos/carrinho.js';
import { atualizarCabecalho, atualizarContadorCarrinho } from '../ui/cabecalho.js';
import { carregarComEstado } from '../ui/estado.js';
import { formatarPreco, ROTULOS } from '../ui/formato.js';

// Pack ids are lowercase words joined by single dashes ("rock-boss-gt-1000").
// Anything else cannot exist, so it is "not found" without asking the server.
const ID_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const alvo = document.querySelector('.estado-carga');
const topo = document.querySelector('.preset-topo');
const conteudo = document.querySelector('.pack-conteudo');
const id = new URLSearchParams(location.search).get('id');

function mostrarNaoEncontrado() {
    const texto = document.createElement('p');
    texto.textContent = 'Pack não encontrado.';
    const link = document.createElement('a');
    link.href = 'packs.html';
    link.textContent = 'Ver todos os packs';
    alvo.replaceChildren(texto, link);
}

function criarItem(preset) {
    const item = document.createElement('li');
    const nome = document.createElement('h3');
    nome.textContent = preset.nome;
    const equipamento = document.createElement('p');
    equipamento.className = 'pack-preset-equipamento';
    equipamento.textContent = `${ROTULOS.marca[preset.marca]} · ${preset.equipamento}`;
    const descricao = document.createElement('p');
    descricao.textContent = preset.descricao;
    item.append(nome, equipamento, descricao);
    return item;
}

/** "No carrinho" link when the pack is in the cart, otherwise the add button. */
function mostrarAcaoCarrinho(id) {
    const acao = topo.querySelector('.pack-acao');
    if (estaNoCarrinho(id)) {
        const link = document.createElement('a');
        link.href = 'carrinho.html';
        link.className = 'botao-no-carrinho';
        link.textContent = 'No carrinho';
        acao.replaceChildren(link);
        return;
    }
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao-tentar';
    botao.textContent = 'Adicionar ao carrinho';
    botao.addEventListener('click', function () {
        adicionarAoCarrinho(id);
        // The button is replaced at once by the "No carrinho" link, so the pack
        // is stored once. A second click of a double click follows that link.
        mostrarAcaoCarrinho(id);
        topo.querySelector('.pack-aviso').textContent = 'Pack adicionado ao carrinho.';
        atualizarContadorCarrinho();
    });
    acao.replaceChildren(botao);
}

function mostrarPack(pack, presets) {
    document.title = `${pack.nome} | CorsinoTones`;
    topo.querySelector('h1').textContent = pack.nome;
    topo.querySelector('.pack-quantidade').textContent = presets.length === 1 ? '1 preset' : `${presets.length} presets`;
    topo.querySelector('.pack-descricao').textContent = pack.descricao;
    topo.querySelector('.pack-preco').textContent = formatarPreco(pack.precoCentavos);
    conteudo.querySelector('.pack-presets').replaceChildren(...presets.map(criarItem));
    mostrarAcaoCarrinho(pack.id);
    topo.hidden = false;
    conteudo.hidden = false;
}

atualizarCabecalho();

if (id === null || !ID_VALIDO.test(id)) {
    mostrarNaoEncontrado();
} else {
    carregarComEstado({
        alvo,
        // Both reads start at once; the pack page needs the two.
        buscar: () => Promise.all([buscarPack(id), listarPresetsDoPack(id)]),
        aoCarregar([pack, presets]) {
            if (pack === null) mostrarNaoEncontrado();
            else mostrarPack(pack, presets);
        },
        mensagens: {
            carregando: 'Carregando pack...',
            erro: 'Não foi possível carregar o pack. Verifique sua conexão e tente novamente.',
        },
    });
}
