// Header state: the cart counter, and the "Entrar" link for visitors or the
// user's first name and a "Sair" button while a session exists. Every page
// module calls atualizarCabecalho once.
import { esvaziarCarrinho, itensDoCarrinho } from '../servicos/carrinho.js';
import { encerrarSessao, usuarioAtual } from '../servicos/sessao.js';

/** Writes "Carrinho (N)" into the header; pages call it again after changing the cart. */
export function atualizarContadorCarrinho() {
    const total = itensDoCarrinho().length;
    for (const texto of document.querySelectorAll('.carrinho-texto')) {
        texto.textContent = `Carrinho (${total})`;
    }
}

export function atualizarCabecalho() {
    atualizarContadorCarrinho();
    const usuario = usuarioAtual();
    const linkEntrar = document.querySelector('a.entrar');
    if (!usuario || !linkEntrar) return;

    // Keeps the "entrar" class so the box sits where the link was at every breakpoint.
    const caixa = document.createElement('div');
    caixa.className = 'entrar sessao';

    // textContent, never innerHTML: the name is user input and must not become markup.
    const saudacao = document.createElement('span');
    saudacao.textContent = `Olá, ${usuario.nome.trim().split(/\s+/)[0]}`;

    const sair = document.createElement('button');
    sair.type = 'button';
    sair.className = 'botao-sair';
    sair.textContent = 'Sair';
    sair.addEventListener('click', function () {
        encerrarSessao();
        // One cart per browser: the next person on this computer starts empty.
        esvaziarCarrinho();
        location.assign('index.html');
    });

    caixa.append(saudacao, sair);
    linkEntrar.replaceWith(caixa);
}
