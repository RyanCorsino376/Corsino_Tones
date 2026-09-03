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
