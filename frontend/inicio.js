// Fills the home carousel with the catalogue, newest first.
(function () {
    const carrossel = document.querySelector('.carrossel');
    if (!carrossel || !Array.isArray(window.PRESETS)) return;

    carrossel.replaceChildren(...window.ordenarMaisRecentes(window.PRESETS).map(window.criarCartao));
})();
