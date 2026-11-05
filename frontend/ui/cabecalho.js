// Header state: the "Entrar" link for visitors, or the user's first name and a
// "Sair" button while a session exists. Every page module calls this once.
import { encerrarSessao, usuarioAtual } from '../servicos/sessao.js';

export function atualizarCabecalho() {
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
        location.assign('index.html');
    });

    caixa.append(saudacao, sair);
    linkEntrar.replaceWith(caixa);
}
