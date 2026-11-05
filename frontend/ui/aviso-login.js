// Modal pop-up asking a signed-out visitor to sign in before using a page.
// A native <dialog> opened with showModal() traps focus, dims the page
// behind it and closes on Esc without extra code.

/**
 * Opens the pop-up. "Fazer login" goes to the login and comes back to
 * `pagina` afterwards; "Voltar" (or Esc) goes to the home page, so a
 * signed-out visitor never stays on the protected page.
 */
export function pedirLogin({ mensagem, pagina }) {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'aviso-login';
    dialogo.setAttribute('aria-labelledby', 'aviso-login-texto');

    const texto = document.createElement('p');
    texto.id = 'aviso-login-texto';
    texto.textContent = mensagem;

    const acoes = document.createElement('div');
    acoes.className = 'aviso-login-acoes';

    const entrar = document.createElement('button');
    entrar.type = 'button';
    entrar.className = 'botao-tentar';
    entrar.textContent = 'Fazer login';
    entrar.addEventListener('click', function () {
        location.assign(`login.html?voltar=${encodeURIComponent(pagina)}`);
    });

    const voltar = document.createElement('button');
    voltar.type = 'button';
    voltar.className = 'botao-sair';
    voltar.textContent = 'Voltar';
    voltar.addEventListener('click', irParaInicio);

    // Esc fires "cancel"; it leaves the page like "Voltar" instead of only closing.
    dialogo.addEventListener('cancel', function (evento) {
        evento.preventDefault();
        irParaInicio();
    });

    acoes.append(entrar, voltar);
    dialogo.append(texto, acoes);
    document.body.append(dialogo);
    dialogo.showModal();
}

function irParaInicio() {
    location.assign('index.html');
}
