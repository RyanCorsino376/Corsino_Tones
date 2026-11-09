// Entry module for checkout.html: requires a session, shows the order summary
// with prices from the API, and takes a simulated card payment.
import { listarPacks } from '../api/packs.js';
import { itensDoCarrinho, removerDoCarrinho } from '../servicos/carrinho.js';
import { usuarioAtual } from '../servicos/sessao.js';
import { pedirLogin } from '../ui/aviso-login.js';
import { atualizarCabecalho, atualizarContadorCarrinho } from '../ui/cabecalho.js';
import { carregarComEstado } from '../ui/estado.js';
import { formatarPreco } from '../ui/formato.js';

const resumo = document.querySelector('.checkout-resumo');
const itensResumo = document.querySelector('.itens-checkout');
const totalResumo = resumo.querySelector('.total-carrinho');
const form = document.getElementById('form-pagamento');
const botaoPagar = form.querySelector('button[type="submit"]');
const vazio = document.querySelector('.carrinho-vazio');
const aviso = document.querySelector('.carrinho-aviso');

// What the visitor sees in the summary is exactly what the order will carry.
const pedidoAtual = { packs: [], totalCentavos: 0 };

function mostrarVazio() {
    resumo.hidden = true;
    form.hidden = true;
    vazio.hidden = false;
}

function criarItemResumo(pack) {
    const item = document.createElement('li');
    const nome = document.createElement('span');
    nome.textContent = pack.nome;
    const preco = document.createElement('span');
    preco.className = 'item-preco';
    preco.textContent = formatarPreco(pack.precoCentavos);
    item.append(nome, preco);
    return item;
}

function mostrarResumo(packs) {
    pedidoAtual.packs = packs;
    // Integer cents: no rounding error in the sum.
    pedidoAtual.totalCentavos = packs.reduce((soma, pack) => soma + pack.precoCentavos, 0);
    const total = formatarPreco(pedidoAtual.totalCentavos);
    itensResumo.replaceChildren(...packs.map(criarItemResumo));
    totalResumo.textContent = `Total: ${total}`;
    botaoPagar.textContent = `Pagar ${total}`;
    resumo.hidden = false;
    form.hidden = false;
}

/** Same rules as the cart page: cart order, unknown packs removed with a notice. */
function aoCarregar(packs) {
    const porId = new Map(packs.map((pack) => [pack.id, pack]));
    const ids = itensDoCarrinho();
    const sumidos = ids.filter((id) => !porId.has(id));
    for (const id of sumidos) removerDoCarrinho(id);
    if (sumidos.length > 0) aviso.textContent = 'Um pack do seu carrinho não está mais disponível e foi removido.';
    atualizarContadorCarrinho();
    const doCarrinho = ids.filter((id) => porId.has(id)).map((id) => porId.get(id));
    if (doCarrinho.length === 0) mostrarVazio();
    else mostrarResumo(doCarrinho);
}

atualizarCabecalho();

if (!usuarioAtual()) {
    // Back to the cart, not the home page: the visitor was buying.
    pedirLogin({ mensagem: 'Faça login para finalizar a compra', pagina: 'checkout.html', voltarPara: 'carrinho.html' });
} else if (itensDoCarrinho().length === 0) {
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
