// Evidence for docs/etapa-04.md: use of functions.
// Excerpts copied verbatim from the source files named above each block;
// line numbers refer to those files. Not loaded by any page.

// ---- frontend/cartao.js, lines 4-29 ----
    function criarCartao(preset) {
        const cartao = document.createElement('a');
        cartao.className = 'cartao';
        cartao.href = 'preset.html';

        const nome = document.createElement('h2');
        nome.className = 'cartao-nome';
        nome.textContent = preset.nome;

        const equipamento = document.createElement('p');
        equipamento.className = 'cartao-equipamento';
        equipamento.textContent = window.ROTULOS.marca[preset.marca] + ' · ' + preset.equipamento;

        const estilo = document.createElement('p');
        estilo.className = 'cartao-estilo';
        estilo.textContent = window.ROTULOS.estilo[preset.estilo];

        cartao.append(nome, equipamento, estilo);
        return cartao;
    }

    // Copies before sorting: Array.prototype.sort mutates, and PRESETS is shared.
    function ordenarMaisRecentes(lista) {
        // ISO dates (YYYY-MM-DD) compare correctly as plain strings.
        return [...lista].sort((a, b) => b.data.localeCompare(a.data));
    }

// ---- frontend/presets.js, lines 13-63 ----
    /** Lowercase, accent-free form of a text, so "Distorção" matches "distorcao". */
    function normalizar(texto) {
        return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

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

    function atualizar() {
        const visiveis = filtrar(window.PRESETS, lerCriterios());
        renderizar(ordenar(visiveis, ordem.value));
    }

// ---- frontend/login.js, lines 60-106 ----
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
