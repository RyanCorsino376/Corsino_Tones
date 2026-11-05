// Entry module for presets.html. Loads the catalogue from the API, then
// re-renders it whenever a filter changes. Every update runs the same pipeline:
// read criteria -> filter -> sort -> draw.
import { listarPresets } from '../api/presets.js';
import { criarCartao, ordenarMaisRecentes } from '../ui/cartao.js';
import { carregarComEstado } from '../ui/estado.js';

// Fixed wording from the spec's assumption table.
const MENSAGENS = {
    carregando: 'Carregando presets...',
};

const grade = document.querySelector('.grade-presets');
const form = document.getElementById('form-filtros');
const busca = document.getElementById('busca');
const ordem = document.getElementById('ordem');
const contagem = document.getElementById('contagem');
const vazia = document.querySelector('.lista-vazia');

// null until the first successful load; the controls work before that, and
// whatever they hold is applied when the data arrives.
let catalogo = null;

/** Lowercase, accent-free form of a text, so "Distorção" matches "distorcao". */
function normalizar(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
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
    return ordenarMaisRecentes(lista);
}

function renderizar(lista) {
    grade.replaceChildren(...lista.map(criarCartao));
    contagem.textContent = lista.length === 1
        ? '1 preset encontrado'
        : `${lista.length} presets encontrados`;
    vazia.hidden = lista.length > 0;
}

function atualizar() {
    if (catalogo === null) return;
    const visiveis = filtrar(catalogo, lerCriterios());
    renderizar(ordenar(visiveis, ordem.value));
}

form.addEventListener('change', atualizar);
// The search box sits outside the form element, so its events do not bubble there.
busca.addEventListener('input', atualizar);
ordem.addEventListener('change', atualizar);
// "reset" fires before the browser clears the fields, so the redraw waits one tick.
form.addEventListener('reset', function () {
    setTimeout(atualizar, 0);
});
form.addEventListener('submit', function (evento) {
    // Filtering is client-side: "Aplicar" only re-runs the filter in place.
    evento.preventDefault();
    atualizar();
});

carregarComEstado({
    alvo: document.querySelector('.estado-carga'),
    buscar: listarPresets,
    aoCarregar(dados) {
        catalogo = dados;
        atualizar();
    },
    mensagens: MENSAGENS,
});
