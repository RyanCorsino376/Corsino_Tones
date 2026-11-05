// Entry module for biblioteca.html. The library is personal: without a session
// the visitor goes to the login and comes back here afterwards.
import { exigirLogin } from '../servicos/sessao.js';
import { atualizarCabecalho } from '../ui/cabecalho.js';

if (exigirLogin('biblioteca.html')) atualizarCabecalho();
