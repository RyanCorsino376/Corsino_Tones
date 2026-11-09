// Entry module for carrinho.html: the packs in the cart, their current prices
// from the API, removal and total. The cart itself holds only pack ids.
import { listarPacks } from '../api/packs.js';
import { itensDoCarrinho, removerDoCarrinho } from '../servicos/carrinho.js';
import { atualizarCabecalho, atualizarContadorCarrinho } from '../ui/cabecalho.js';
import { carregarComEstado } from '../ui/estado.js';
import { formatarPreco } from '../ui/formato.js';

const lista = document.querySelector('.carrinho-lista');
const itens = document.querySelector('.itens-carrinho');
const contagem = document.getElementById('contagem-carrinho');
const total = document.querySelector('.total-carrinho');
const vazio = document.querySelector('.carrinho-vazio');
const aviso = document.querySelector('.carrinho-aviso');

// Packs of the cart, in cart order, once loaded. Removing an item works on this
// list: the prices just came from the API, so there is no need to ask again.
let packsDoCarrinho = [];

function mostrarVazio() {
    // Cleared, not only hidden: no stale item may linger in the page.
    itens.replaceChildren();
    lista.hidden = true;
    vazio.hidden = false;
}

function criarItem(pack) {
    const item = document.createElement('li');

    const nome = document.createElement('a');
    nome.href = `pack.html?id=${encodeURIComponent(pack.id)}`;
    nome.textContent = pack.nome;

    const preco = document.createElement('span');
    preco.className = 'item-preco';
    preco.textContent = formatarPreco(pack.precoCentavos);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'botao-sair';
    remover.textContent = 'Remover';
    remover.addEventListener('click', function () {
        removerDoCarrinho(pack.id);
        packsDoCarrinho = packsDoCarrinho.filter((p) => p.id !== pack.id);
        renderizar();
        atualizarContadorCarrinho();
    });

    item.append(nome, preco, remover);
    return item;
}

function renderizar() {
    if (packsDoCarrinho.length === 0) {
        mostrarVazio();
        return;
    }
    itens.replaceChildren(...packsDoCarrinho.map(criarItem));
    contagem.textContent = packsDoCarrinho.length === 1
        ? '1 pack no carrinho'
        : `${packsDoCarrinho.length} packs no carrinho`;
    // Prices travel as integer cents, so the sum has no rounding error.
    const centavos = packsDoCarrinho.reduce((soma, pack) => soma + pack.precoCentavos, 0);
    total.textContent = `Total: ${formatarPreco(centavos)}`;
    vazio.hidden = true;
    lista.hidden = false;
}

function aoCarregar(packs) {
    const porId = new Map(packs.map((pack) => [pack.id, pack]));
    const ids = itensDoCarrinho();
    const sumidos = ids.filter((id) => !porId.has(id));
    // A pack the API no longer has cannot be bought: drop it and say so.
    for (const id of sumidos) removerDoCarrinho(id);
    if (sumidos.length > 0) aviso.textContent = 'Um pack do seu carrinho não está mais disponível e foi removido.';
    packsDoCarrinho = ids.filter((id) => porId.has(id)).map((id) => porId.get(id));
    renderizar();
    atualizarContadorCarrinho();
}

atualizarCabecalho();

if (itensDoCarrinho().length === 0) {
    // Nothing to price, so nothing to ask the server.
    mostrarVazio();
} else {
    carregarComEstado({
        alvo: document.querySelector('.estado-carga'),
        buscar: listarPacks,
        aoCarregar,
        mensagens: {
            carregando: 'Carregando carrinho...',
            erro: 'Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente.',
        },
    });
}
