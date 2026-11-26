// Entry module for checkout.html: requires a session, shows the order summary
// with prices from the API, and takes a simulated card payment.
import { listarPacks } from '../api/packs.js';
import { criarPedido } from '../api/pedidos.js';
import { esvaziarCarrinho, itensDoCarrinho, removerDoCarrinho } from '../servicos/carrinho.js';
import { PagamentoRecusado, processarPagamento, validarCampoCartao } from '../servicos/pagamento.js';
import { ErroApi } from '../api/cliente.js';
import { pedirNovoLogin, sessaoExpirada, tokenAtual, usuarioAtual } from '../servicos/sessao.js';
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
const confirmacao = document.querySelector('.checkout-confirmacao');

const MSG_RECUSADO = 'Pagamento recusado. Verifique os dados do cartão ou use outro cartão.';
const MSG_FALHOU = 'Não foi possível concluir a compra. Verifique sua conexão e tente novamente.';

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

// One alert per form, reused, so a second failure never stacks a second message.
function mostrarAlerta(mensagem) {
    let alerta = form.querySelector('.erro-formulario');
    if (!alerta) {
        alerta = document.createElement('p');
        alerta.className = 'erro-formulario';
        alerta.setAttribute('role', 'alert');
        botaoPagar.before(alerta);
    }
    alerta.textContent = mensagem;
}

function limparAlerta() {
    const alerta = form.querySelector('.erro-formulario');
    if (alerta) alerta.remove();
}

function mostrarConfirmacao(pedido) {
    const titulo = document.createElement('h2');
    titulo.textContent = 'Compra aprovada!';
    const numero = document.createElement('p');
    numero.textContent = `Pedido nº ${pedido.id}`;
    const lista = document.createElement('ul');
    lista.className = 'itens-checkout';
    lista.append(...pedidoAtual.packs.map(criarItemResumo));
    const total = document.createElement('p');
    total.className = 'total-carrinho';
    total.textContent = `Total: ${formatarPreco(pedido.totalCentavos)}`;
    const biblioteca = document.createElement('a');
    biblioteca.href = 'biblioteca.html';
    biblioteca.className = 'botao-tentar finalizar';
    biblioteca.textContent = 'Ir para a biblioteca';

    confirmacao.replaceChildren(titulo, numero, lista, total, biblioteca);
    resumo.hidden = true;
    form.hidden = true;
    aviso.textContent = '';
    confirmacao.hidden = false;
}

/**
 * Payment first (local, no network), then the order. The cart is emptied only
 * after the server has the order, so a failure loses nothing and a retry
 * cannot create a second order for one click.
 */
async function pagar() {
    const textoOriginal = botaoPagar.textContent;
    limparAlerta();
    botaoPagar.disabled = true;
    botaoPagar.textContent = 'Processando pagamento...';
    try {
        await processarPagamento(document.getElementById('cartao-numero').value);
        // Only the pack ids go out: the server takes the user from the token and sets
        // prices, total, status and time (MIG-05). No card field ever goes out.
        const pedido = await criarPedido(pedidoAtual.packs.map((pack) => pack.id), tokenAtual());
        esvaziarCarrinho();
        atualizarContadorCarrinho();
        mostrarConfirmacao(pedido);
        return;
    } catch (erro) {
        if (sessaoExpirada(erro)) {
            // The cart stays in localStorage, so it is still there after the new login (MIG-08).
            pedirNovoLogin('checkout.html');
            return;
        }
        mostrarAlerta(mensagemDaFalha(erro));
    }
    botaoPagar.disabled = false;
    botaoPagar.textContent = textoOriginal;
}

/** The server's own message for a rejected pack list (MIG-09), otherwise the fixed messages. */
function mensagemDaFalha(erro) {
    if (erro instanceof PagamentoRecusado) return MSG_RECUSADO;
    const doServidor = erro instanceof ErroApi && erro.status === 400 ? erro.corpo?.campos?.packIds : undefined;
    return typeof doServidor === 'string' ? doServidor : MSG_FALHOU;
}

form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    // The button is disabled while paying; this also stops a submit by Enter.
    if (botaoPagar.disabled) return;
    if (!validarFormulario()) return;
    pagar();
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
