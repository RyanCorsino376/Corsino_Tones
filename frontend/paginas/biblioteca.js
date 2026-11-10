// Entry module for biblioteca.html. The library is personal: a signed-out
// visitor gets a pop-up offering the login, which comes back here afterwards.
// A signed-in user sees the packs of their paid orders (servicos/biblioteca.js).
import { carregarBiblioteca } from '../servicos/biblioteca.js';
import { usuarioAtual } from '../servicos/sessao.js';
import { pedirLogin } from '../ui/aviso-login.js';
import { atualizarCabecalho } from '../ui/cabecalho.js';
import { carregarComEstado } from '../ui/estado.js';
import { ROTULOS } from '../ui/formato.js';

const alvo = document.querySelector('.estado-carga');
const vazia = document.querySelector('.biblioteca-vazia');
const lista = document.querySelector('.biblioteca-packs');

function criarLinhaPreset(preset) {
    const item = document.createElement('li');
    const nome = document.createElement('h3');
    nome.textContent = preset.nome;
    const equipamento = document.createElement('p');
    equipamento.className = 'pack-preset-equipamento';
    equipamento.textContent = `${ROTULOS.marca[preset.marca]} · ${preset.equipamento}`;
    const descricao = document.createElement('p');
    descricao.textContent = preset.descricao;
    item.append(nome, equipamento, descricao);
    return item;
}

function criarBlocoPack(pack) {
    const bloco = document.createElement('article');
    bloco.className = 'biblioteca-pack';
    const titulo = document.createElement('h2');
    titulo.textContent = pack.nome;
    const quantidade = document.createElement('p');
    quantidade.className = 'pack-quantidade';
    quantidade.textContent = pack.presets.length === 1 ? '1 preset' : `${pack.presets.length} presets`;
    const presets = document.createElement('ul');
    presets.className = 'pack-presets';
    presets.append(...pack.presets.map(criarLinhaPreset));
    bloco.append(titulo, quantidade, presets);
    return bloco;
}

function mostrar(packs) {
    vazia.hidden = packs.length > 0;
    lista.hidden = packs.length === 0;
    lista.replaceChildren(...packs.map(criarBlocoPack));
}

atualizarCabecalho();

const usuario = usuarioAtual();
if (!usuario) {
    pedirLogin({ mensagem: 'Faça login para acessar sua biblioteca', pagina: 'biblioteca.html' });
} else {
    carregarComEstado({
        alvo,
        buscar: () => carregarBiblioteca(usuario.id),
        aoCarregar: mostrar,
        mensagens: {
            carregando: 'Carregando biblioteca...',
            erro: 'Não foi possível carregar a biblioteca. Verifique sua conexão e tente novamente.',
        },
    });
}
