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

    const sucesso = {
        'form-login': 'Dados válidos! O login ficará disponível quando o servidor estiver pronto.',
        'form-cadastro': 'Dados válidos! O cadastro ficará disponível quando o servidor estiver pronto.',
    };

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

    function aoEnviar(evento) {
        // No server yet: a valid form is never sent either.
        evento.preventDefault();
        const form = evento.currentTarget;
        const campos = Array.from(form.querySelectorAll('input'));
        const aviso = form.querySelector('.mensagem-sucesso');

        campos.forEach((campo) => {
            const mensagem = validarCampo(campo);
            if (mensagem) mostrarErro(campo, mensagem);
            else limparErro(campo);
        });

        const valido = campos.every((campo) => !campo.hasAttribute('aria-invalid'));
        aviso.hidden = !valido;
        aviso.textContent = valido ? sucesso[form.id] : '';
        if (!valido) campos.find((campo) => campo.hasAttribute('aria-invalid')).focus();
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

    for (const id of Object.keys(sucesso)) {
        const form = document.getElementById(id);
        if (!form) continue;
        form.addEventListener('submit', aoEnviar);
        form.addEventListener('input', aoDigitar);
    }
})();
