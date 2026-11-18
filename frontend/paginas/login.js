// Entry module for login.html: card flip, field validation, and sending both
// forms to the users API (etapa05-auth).
import { cadastrar, CredenciaisInvalidas, DadosInvalidos, EmailEmUso, entrar } from '../servicos/auth.js';
import { abrirSessao, destinoSeguro, usuarioAtual } from '../servicos/sessao.js';
import { atualizarContadorCarrinho } from '../ui/cabecalho.js';

const voltar = new URLSearchParams(location.search).get('voltar');

// Already signed in: the forms have nothing to do, so go where the visitor was heading.
if (usuarioAtual()) location.replace(destinoSeguro(voltar));

// The login page has no "Entrar" link to replace; only the cart counter needs updating.
atualizarContadorCarrinho();

// Progressive enhancement: the flip styling is scoped to .js-flip, added below.
// If this script never runs, both faces stay stacked and usable.
(function () {
    const cartao = document.querySelector('.cartao-login');
    if (!cartao) return;

    const faces = {
        login: cartao.querySelector('.face-login'),
        cadastro: cartao.querySelector('.face-cadastro'),
    };

    function mostrar(vista, moverFoco) {
        cartao.dataset.vista = vista;

        for (const nome of Object.keys(faces)) {
            const oculta = nome !== vista;
            // inert drops the hidden face from the tab order on its own, so the
            // keyboard never reaches a control the user cannot see.
            faces[nome].inert = oculta;
            faces[nome].setAttribute('aria-hidden', String(oculta));
        }

        if (moverFoco) {
            const primeiro = faces[vista].querySelector('input');
            if (primeiro) primeiro.focus();
        }
    }

    cartao.addEventListener('click', function (evento) {
        const gatilho = evento.target.closest('[data-alvo]');
        if (gatilho) mostrar(gatilho.dataset.alvo, true);
    });

    cartao.classList.add('js-flip');
    // No focus move on load: stealing focus on page load is its own defect.
    mostrar('login', false);
})();

// Validation of both forms. The forms carry novalidate, so this script owns the
// messages; without it, the required/type attributes still let the browser check.
(function () {
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const MSG_EMAIL = 'Informe um e-mail válido, como nome@exemplo.com.';

    // Each rule returns the error message, or '' when the value is valid.
    // Values arrive trimmed, so whitespace-only counts as empty.
    const regras = {
        'email': (valor) => (EMAIL.test(valor) ? '' : MSG_EMAIL),
        'senha': (valor) => (valor === '' ? 'Informe sua senha.' : ''),
        'cadastro-nome': (valor) => (valor.length >= 2 ? '' : 'Informe um nome com pelo menos 2 caracteres.'),
        'cadastro-email': (valor) => (EMAIL.test(valor) ? '' : MSG_EMAIL),
        'cadastro-senha': (valor) => (valor.length >= 8 ? '' : 'A senha precisa ter pelo menos 8 caracteres.'),
    };

    const MSG_CONEXAO = 'Não foi possível conectar ao servidor. Tente novamente.';
    const TEXTO_PENDENTE = { 'form-login': 'Entrando...', 'form-cadastro': 'Cadastrando...' };

    function validarCampo(campo) {
        const regra = regras[campo.id];
        return regra ? regra(campo.value.trim()) : '';
    }

    // Reuses the field's message element, so a repeated submit never duplicates it.
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

    // One alert per form, reused, so a second failure never stacks a second message.
    function mostrarAlerta(form, mensagem) {
        let alerta = form.querySelector('.erro-formulario');
        if (!alerta) {
            alerta = document.createElement('p');
            alerta.className = 'erro-formulario';
            alerta.setAttribute('role', 'alert');
            form.querySelector('button[type="submit"]').before(alerta);
        }
        alerta.textContent = mensagem;
    }

    function limparAlerta(form) {
        const alerta = form.querySelector('.erro-formulario');
        if (alerta) alerta.remove();
    }

    // Field names of the Spring error body, in the order the fields appear in each form.
    const CAMPOS_DO_SERVIDOR = {
        'form-login': { email: 'email', senha: 'senha' },
        'form-cadastro': { nome: 'cadastro-nome', email: 'cadastro-email', senha: 'cadastro-senha' },
    };

    /** Shows each server message on its field and focuses the first one. Returns false when none matched a field. */
    function mostrarErrosDoServidor(form, campos) {
        const campoPorNome = CAMPOS_DO_SERVIDOR[form.id];
        const marcados = Object.entries(campoPorNome)
            .filter(([nome]) => typeof campos[nome] === 'string')
            .map(([nome, idCampo]) => {
                const campo = form.querySelector(`#${idCampo}`);
                mostrarErro(campo, campos[nome]);
                return campo;
            });
        if (marcados.length === 0) return false;
        marcados[0].focus();
        return true;
    }

    function tratarFalha(form, erro) {
        if (erro instanceof CredenciaisInvalidas) {
            mostrarAlerta(form, erro.message);
            form.querySelector('#senha').value = '';
            return;
        }
        if (erro instanceof EmailEmUso) {
            // A field problem, so it uses the same message pattern as the etapa04 rules.
            const campo = form.querySelector('#cadastro-email');
            mostrarErro(campo, erro.message);
            campo.focus();
            return;
        }
        if (erro instanceof DadosInvalidos && mostrarErrosDoServidor(form, erro.campos)) return;
        // Anything else is a communication failure, already logged by api/cliente.js.
        mostrarAlerta(form, MSG_CONEXAO);
    }

    /** Runs `acao` with the submit button in its pending state; on success, signs in and leaves. */
    async function enviar(form, acao) {
        const botao = form.querySelector('button[type="submit"]');
        const textoOriginal = botao.textContent;
        limparAlerta(form);
        // Disabled while pending: a double click must not send the form twice.
        botao.disabled = true;
        botao.textContent = TEXTO_PENDENTE[form.id];
        try {
            abrirSessao(await acao());
            // The button stays disabled while the next page loads.
            location.replace(destinoSeguro(voltar));
            return;
        } catch (erro) {
            tratarFalha(form, erro);
        }
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }

    function aoEnviar(evento) {
        evento.preventDefault();
        const form = evento.currentTarget;
        const campos = Array.from(form.querySelectorAll('input'));

        campos.forEach((campo) => {
            const mensagem = validarCampo(campo);
            if (mensagem) mostrarErro(campo, mensagem);
            else limparErro(campo);
        });

        const valido = campos.every((campo) => !campo.hasAttribute('aria-invalid'));
        if (!valido) {
            campos.find((campo) => campo.hasAttribute('aria-invalid')).focus();
            return;
        }

        if (form.id === 'form-login') {
            enviar(form, () => entrar(form.querySelector('#email').value, form.querySelector('#senha').value));
        } else {
            enviar(form, () => cadastrar({
                nome: form.querySelector('#cadastro-nome').value,
                email: form.querySelector('#cadastro-email').value,
                senha: form.querySelector('#cadastro-senha').value,
            }));
        }
    }

    // Only fields a submit already rejected are re-checked, so typing before the
    // first submit never shows a message.
    function aoDigitar(evento) {
        const campo = evento.target;
        if (!campo.hasAttribute('aria-invalid')) return;
        const mensagem = validarCampo(campo);
        if (mensagem) mostrarErro(campo, mensagem);
        else limparErro(campo);
    }

    for (const id of ['form-login', 'form-cadastro']) {
        const form = document.getElementById(id);
        if (!form) continue;
        form.addEventListener('submit', aoEnviar);
        form.addEventListener('input', aoDigitar);
    }
})();
