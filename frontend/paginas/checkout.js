// Entry module for checkout.html: requires a session, shows the order summary
// with prices from the API, and takes a simulated card payment.
import { listarPacks } from '../api/packs.js';
import { itensDoCarrinho, removerDoCarrinho } from '../servicos/carrinho.js';
import { validarCampoCartao } from '../servicos/pagamento.js';
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

// Field id -> rule name in servicos/pagamento.js.
const CAMPOS = {
    'cartao-numero': 'numero',
    'cartao-nome': 'nome',
    'cartao-validade': 'validade',
    'cartao-cvv': 'cvv',
};

function validarCampo(campo) {
    return validarCampoCartao(CAMPOS[campo.id], campo.value);
}

// Same field-message pattern as the login forms (etapa04): one message element
// per field, reused by id so a second submit never duplicates it.
function mostrarErro(campo, mensagem) {
    const idMensagem = `${campo.id}-erro`;
    let elemento = document.getElementById(idMensagem);
    if (!elemento) {
        elemento = document.createElement('p');
        elemento.id = idMensagem;
        elemento.className = 'erro-campo';
        campo.after(elemento);
    }
    elemento.textContent = mensagem;
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', idMensagem);
}

function limparErro(campo) {
    const elemento = document.getElementById(`${campo.id}-erro`);
    if (elemento) elemento.remove();
    campo.removeAttribute('aria-invalid');
    campo.removeAttribute('aria-describedby');
}

/** Checks every field; returns true when all are valid, otherwise focuses the first error. */
function validarFormulario() {
    const campos = Object.keys(CAMPOS).map((id) => document.getElementById(id));
    for (const campo of campos) {
        const mensagem = validarCampo(campo);
        if (mensagem) mostrarErro(campo, mensagem);
        else limparErro(campo);
    }
    const primeiroErro = campos.find((campo) => campo.hasAttribute('aria-invalid'));
    if (primeiroErro) primeiroErro.focus();
    return !primeiroErro;
}

form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    if (!validarFormulario()) return;
});

// Only fields a submit already rejected are re-checked while typing.
form.addEventListener('input', function (evento) {
    const campo = evento.target;
    if (!campo.hasAttribute('aria-invalid')) return;
    const mensagem = validarCampo(campo);
    if (mensagem) mostrarErro(campo, mensagem);
    else limparErro(campo);
});

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
