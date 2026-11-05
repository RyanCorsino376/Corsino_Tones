// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-auth/spec.md: the request half of
// AUTH-02 (GET /usuarios?email=) and CAD-02 (POST /usuarios). The module is
// imported in a host page (login.html), as in tests/api-cliente.spec.js.

const API = 'http://127.0.0.1:3000';
const MODULO = '/frontend/api/usuarios.js';
const USUARIO_SEMENTE = { id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com', senha: 'teste123' };

/** An e-mail no other test or run uses, so tests can write to a shared server. */
const emailUnico = () => `teste-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemplo.com`;

/** Runs one function of the users module in the page and reports how it settled. */
function chamar(page, funcao, argumento) {
  return page.evaluate(async ({ modulo, funcao, argumento }) => {
    const api = await import(modulo);
    const { ErroApi } = await import('/frontend/api/cliente.js');
    try {
      return { ok: true, valor: await api[funcao](argumento) };
    } catch (erro) {
      return { ok: false, erroApi: erro instanceof ErroApi };
    }
  }, { modulo: MODULO, funcao, argumento });
}

test.describe('etapa05-auth T2 - users API module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // AUTH-02 (request half)
  test('buscarUsuarioPorEmail devolve o usuário da semente', async ({ page }) => {
    expect(await chamar(page, 'buscarUsuarioPorEmail', 'ryan@exemplo.com')).toEqual({ ok: true, valor: USUARIO_SEMENTE });
  });

  // AUTH-02 (request half): no match is not an error.
  test('buscarUsuarioPorEmail devolve null para um e-mail sem conta', async ({ page }) => {
    expect(await chamar(page, 'buscarUsuarioPorEmail', emailUnico())).toEqual({ ok: true, valor: null });
  });

  // AUTH-02 (request half): the e-mail travels encoded in the query string.
  test('o e-mail vai codificado na URL', async ({ page }) => {
    await page.route(`${API}/usuarios?**`, (rota) => rota.fulfill({ json: [] }));
    const pedido = page.waitForRequest((req) => req.url().startsWith(`${API}/usuarios?`));
    await chamar(page, 'buscarUsuarioPorEmail', 'a+b@x.com');
    const url = new URL((await pedido).url());
    expect(url.pathname).toBe('/usuarios');
    expect(url.search).toBe('?email=a%2Bb%40x.com');
  });

  // AUTH-02 (request half): a body that is not a list is a communication failure.
  test('um corpo que não é lista rejeita com ErroApi', async ({ page }) => {
    await page.route(`${API}/usuarios?**`, (rota) => rota.fulfill({ json: { usuarios: [] } }));
    expect(await chamar(page, 'buscarUsuarioPorEmail', 'ryan@exemplo.com')).toEqual({ ok: false, erroApi: true });
  });

  // CAD-02 (request half)
  test('criarUsuario envia POST /usuarios em JSON e o registro passa a existir', async ({ page, request }) => {
    const novo = { nome: 'Ana Teste', email: emailUnico(), senha: 'senha1234' };
    const pedido = page.waitForRequest((req) => req.url() === `${API}/usuarios` && req.method() === 'POST');

    const resultado = await chamar(page, 'criarUsuario', novo);

    const enviado = await pedido;
    expect(enviado.headers()['content-type']).toBe('application/json');
    expect(enviado.postDataJSON()).toEqual(novo);
    expect(resultado.ok).toBe(true);
    expect(resultado.valor).toMatchObject(novo);
    expect(typeof resultado.valor.id).toBe('number');

    const consulta = await request.get(`${API}/usuarios?email=${encodeURIComponent(novo.email)}`);
    expect(await consulta.json()).toEqual([resultado.valor]);
  });
});
