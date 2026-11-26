// @ts-check
// Test data through the real Spring API (etapa06-front-spring-loja). The database is
// shared by every run, so each helper call makes its own user with a unique e-mail
// and no test may count rows it did not create.
const { expect } = require('@playwright/test');

const SPRING = 'http://127.0.0.1:8081';
const SENHA = 'senha-de-teste-123';

const emailUnico = (prefixo = 'cliente') =>
  `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1e9)}@exemplo.com`;

/**
 * Registers a new user and signs in. Resolves with { token, usuario, sessao }, where
 * `sessao` is the JSON the site keeps under 'corsino:sessao'.
 * @param {import('@playwright/test').APIRequestContext} request
 */
async function registrarUsuario(request, nome = 'Cliente Teste') {
  const email = emailUnico();
  const cadastro = await request.post(`${SPRING}/auth/cadastro`, { data: { nome, email, senha: SENHA } });
  expect(cadastro.status(), await cadastro.text()).toBe(201);
  const login = await request.post(`${SPRING}/auth/login`, { data: { email, senha: SENHA } });
  expect(login.status()).toBe(200);
  const { token, usuario } = await login.json();
  return { token, usuario, sessao: JSON.stringify({ ...usuario, token }) };
}

/**
 * Creates a paid order for the token's user and resolves with it.
 * @param {import('@playwright/test').APIRequestContext} request
 */
async function comprar(request, token, packIds) {
  const resposta = await request.post(`${SPRING}/pedidos`, {
    data: { packIds }, headers: { Authorization: `Bearer ${token}` },
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
  return resposta.json();
}

/**
 * The paid orders of the token's user, newest first.
 * @param {import('@playwright/test').APIRequestContext} request
 */
async function pedidosPagos(request, token) {
  const resposta = await request.get(`${SPRING}/pedidos?status=pago`, { headers: { Authorization: `Bearer ${token}` } });
  expect(resposta.status()).toBe(200);
  return resposta.json();
}

module.exports = { SPRING, SENHA, emailUnico, registrarUsuario, comprar, pedidosPagos };
