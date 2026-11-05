// Entry module for biblioteca.html. The library is personal: a signed-out
// visitor gets a pop-up offering the login, which comes back here afterwards.
import { usuarioAtual } from '../servicos/sessao.js';
import { pedirLogin } from '../ui/aviso-login.js';
import { atualizarCabecalho } from '../ui/cabecalho.js';

atualizarCabecalho();

if (!usuarioAtual()) {
    pedirLogin({ mensagem: 'Faça login para acessar sua biblioteca', pagina: 'biblioteca.html' });
}
