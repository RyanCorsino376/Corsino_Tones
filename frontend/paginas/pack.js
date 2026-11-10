// Entry module for pack.html?id={pack id}: one pack (one style for one
// pedalboard model), its price and the presets it includes. Presets are
// listed, not shown as cards: they are not sold alone.
import { buscarPack } from '../api/packs.js';
import { listarPresetsDoPack } from '../api/presets.js';
import { idsComprados } from '../servicos/biblioteca.js';
import { adicionarAoCarrinho, estaNoCarrinho } from '../servicos/carrinho.js';
import { usuarioAtual } from '../servicos/sessao.js';
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

/**
 * Whether the signed-in user already bought the pack (plan R2). A signed-out
 * visitor owns nothing, so no request is made. If the orders cannot be read the
 * page still works: the library, not this page, is what proves ownership.
 */
async function jaComprou(id) {
    const usuario = usuarioAtual();
    if (!usuario) return false;
    try {
        return (await idsComprados(usuario.id)).has(id);
    } catch {
        return false;
    }
}

/** "Na biblioteca" if bought, "No carrinho" if in the cart, otherwise the add button. */
function mostrarAcaoCarrinho(id, comprado) {
    const acao = topo.querySelector('.pack-acao');
    if (comprado) {
        const link = document.createElement('a');
        link.href = 'biblioteca.html';
        link.className = 'botao-no-carrinho';
        link.textContent = 'Na biblioteca';
        acao.replaceChildren(link);
        return;
    }
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
        mostrarAcaoCarrinho(id, false);
        topo.querySelector('.pack-aviso').textContent = 'Pack adicionado ao carrinho.';
        atualizarContadorCarrinho();
    });
    acao.replaceChildren(botao);
}

function mostrarPack(pack, presets, comprado) {
    document.title = `${pack.nome} | CorsinoTones`;
    topo.querySelector('h1').textContent = pack.nome;
    topo.querySelector('.pack-quantidade').textContent = presets.length === 1 ? '1 preset' : `${presets.length} presets`;
    topo.querySelector('.pack-descricao').textContent = pack.descricao;
    topo.querySelector('.pack-preco').textContent = formatarPreco(pack.precoCentavos);
    conteudo.querySelector('.pack-presets').replaceChildren(...presets.map(criarItem));
    mostrarAcaoCarrinho(pack.id, comprado);
    topo.hidden = false;
    conteudo.hidden = false;
}

atualizarCabecalho();

if (id === null || !ID_VALIDO.test(id)) {
    mostrarNaoEncontrado();
} else {
    carregarComEstado({
        alvo,
        // The reads start at once; the page needs all of them.
        buscar: () => Promise.all([buscarPack(id), listarPresetsDoPack(id), jaComprou(id)]),
        aoCarregar([pack, presets, comprado]) {
            if (pack === null) mostrarNaoEncontrado();
            else mostrarPack(pack, presets, comprado);
        },
        mensagens: {
            carregando: 'Carregando pack...',
            erro: 'Não foi possível carregar o pack. Verifique sua conexão e tente novamente.',
        },
    });
}
