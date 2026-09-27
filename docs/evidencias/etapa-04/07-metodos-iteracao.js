// Evidence for docs/etapa-04.md: iteration methods.
// Excerpts copied verbatim from the source files named above each block;
// line numbers refer to those files. Not loaded by any page.

// ---- frontend/presets.js, lines 18-58 ----
    /** Values of the checked boxes named `nome`, e.g. ['boss', 'nux']. */
    function marcados(nome) {
        return Array.from(form.querySelectorAll(`input[name="${nome}"]:checked`), (caixa) => caixa.value);
    }

    function lerCriterios() {
        return {
            marcas: marcados('marca'),
            estilos: marcados('estilo'),
            texto: normalizar(busca.value.trim()),
        };
    }

    // includes() rather than a RegExp: typed characters such as "(" stay literal.
    function contemTexto(preset, texto) {
        return [preset.nome, preset.equipamento, preset.descricao]
            .some((campo) => normalizar(campo).includes(texto));
    }

    // OR inside a group, AND across groups; an empty group or empty search lets everything through.
    function filtrar(lista, criterios) {
        return lista.filter((preset) =>
            (criterios.marcas.length === 0 || criterios.marcas.includes(preset.marca)) &&
            (criterios.estilos.length === 0 || criterios.estilos.includes(preset.estilo)) &&
            (criterios.texto === '' || contemTexto(preset, criterios.texto)));
    }

    // Copies before sorting, like ordenarMaisRecentes: sort() mutates its array.
    function ordenar(lista, modo) {
        if (modo === 'antigos') return [...lista].sort((a, b) => a.data.localeCompare(b.data));
        if (modo === 'nome') return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        return window.ordenarMaisRecentes(lista);
    }

    function renderizar(lista) {
        grade.replaceChildren(...lista.map(window.criarCartao));
        contagem.textContent = lista.length === 1
            ? '1 preset encontrado'
            : `${lista.length} presets encontrados`;
        vazia.hidden = lista.length > 0;
    }

// ---- frontend/cartao.js, lines 25-29 ----
    // Copies before sorting: Array.prototype.sort mutates, and PRESETS is shared.
    function ordenarMaisRecentes(lista) {
        // ISO dates (YYYY-MM-DD) compare correctly as plain strings.
        return [...lista].sort((a, b) => b.data.localeCompare(a.data));
    }

// ---- frontend/inicio.js, lines 6-6 ----
    carrossel.replaceChildren(...window.ordenarMaisRecentes(window.PRESETS).map(window.criarCartao));

// ---- frontend/login.js, lines 87-105 ----
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

