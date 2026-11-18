// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa06-front-spring-auth/spec.md: the request
// half of WEB-01 (login) and WEB-07 (registration), plus WEB-17 and WEB-18 (values
// travel unchanged). The module is imported in a host page (login.html), as in
// tests/api-cliente.spec.js. Spring is intercepted, so no account is created.

const SPRING = 'http://127.0.0.1:8081';
const MODULO = '/frontend/api/auth.js';

/** Runs one function of the auth API module in the page and reports how it settled. */
function chamar(page, funcao, argumento) {
  return page.evaluate(async ({ modulo, funcao, argumento }) => {
    const api = await import(modulo);
    const { ErroApi } = await import('/frontend/api/cliente.js');
    try {
      return { ok: true, valor: await api[funcao](argumento) };
    } catch (erro) {
      return { ok: false, erroApi: erro instanceof ErroApi, status: erro.status };
    }
  }, { modulo: MODULO, funcao, argumento });
}

test.describe('etapa06-front-spring-auth T4 - auth API module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // WEB-01
  test('entrarNoServidor envia POST /auth/login em JSON só com email e senha e devolve a resposta', async ({ page }) => {
    const resposta = { token: 'abc.def.ghi', usuario: { id: 7, nome: 'Davi', email: 'davi@x.com' } };
    await page.route(`${SPRING}/auth/login`, (rota) => rota.fulfill({ json: resposta }));
    const pedido = page.waitForRequest((req) => req.url() === `${SPRING}/auth/login`);

    const resultado = await chamar(page, 'entrarNoServidor', { email: 'davi@x.com', senha: 'segredo123', extra: 'x' });

    const req = await pedido;
    expect(req.method()).toBe('POST');
    expect(req.headers()['content-type']).toBe('application/json');
    expect(req.postDataJSON()).toEqual({ email: 'davi@x.com', senha: 'segredo123' });
    expect(resultado).toEqual({ ok: true, valor: resposta });
  });

  // WEB-07
  test('cadastrarNoServidor envia POST /auth/cadastro em JSON só com nome, email e senha e devolve a resposta', async ({ page }) => {
    const criado = { id: 2, nome: 'Eva', email: 'eva@x.com' };
    await page.route(`${SPRING}/auth/cadastro`, (rota) => rota.fulfill({ status: 201, json: criado }));
    const pedido = page.waitForRequest((req) => req.url() === `${SPRING}/auth/cadastro`);

    const resultado = await chamar(page, 'cadastrarNoServidor', { nome: 'Eva', email: 'eva@x.com', senha: 'segredo123', extra: 'x' });

    const req = await pedido;
    expect(req.method()).toBe('POST');
    expect(req.headers()['content-type']).toBe('application/json');
    expect(req.postDataJSON()).toEqual({ nome: 'Eva', email: 'eva@x.com', senha: 'segredo123' });
    expect(resultado).toEqual({ ok: true, valor: criado });
  });

  // WEB-17, WEB-18: spaces and casing are the server's business, the module sends what it gets.
  test('senha e e-mail com espaços e maiúsculas vão ao servidor exatamente como foram digitados', async ({ page }) => {
    await page.route(`${SPRING}/auth/**`, (rota) => rota.fulfill({ json: {} }));
    const corpos = [];
    page.on('request', (req) => { if (req.url().startsWith(`${SPRING}/auth/`)) corpos.push(req.postDataJSON()); });

    await chamar(page, 'entrarNoServidor', { email: ' Ana@X.com ', senha: '  espacos  ' });
    await chamar(page, 'cadastrarNoServidor', { nome: ' Ana ', email: ' Ana@X.com ', senha: '  espacos  ' });

    expect(corpos).toEqual([
      { email: ' Ana@X.com ', senha: '  espacos  ' },
      { nome: ' Ana ', email: ' Ana@X.com ', senha: '  espacos  ' },
    ]);
  });

  // WEB-01, WEB-07: the mock is never called.
  test('nenhuma das duas funções chama o mock na porta 3000', async ({ page }) => {
    await page.route(`${SPRING}/auth/**`, (rota) => rota.fulfill({ json: {} }));
    const paraOMock = [];
    page.on('request', (req) => { if (req.url().startsWith('http://127.0.0.1:3000')) paraOMock.push(req.url()); });

    await chamar(page, 'entrarNoServidor', { email: 'a@b.c', senha: 'x' });
    await chamar(page, 'cadastrarNoServidor', { nome: 'Ana', email: 'a@b.c', senha: 'x' });

    expect(paraOMock).toEqual([]);
  });

  // Each failure class reaches the caller as one ErroApi with its status.
  for (const status of [401, 409, 400]) {
    test(`um ${status} do servidor rejeita com ErroApi de status ${status}`, async ({ page }) => {
      await page.route(`${SPRING}/auth/**`, (rota) => rota.fulfill({ status, json: { status } }));

      expect(await chamar(page, 'entrarNoServidor', { email: 'a@b.c', senha: 'x' })).toEqual({ ok: false, erroApi: true, status });
      expect(await chamar(page, 'cadastrarNoServidor', { nome: 'Ana', email: 'a@b.c', senha: 'x' })).toEqual({ ok: false, erroApi: true, status });
    });
  }

  test('falha de rede rejeita com ErroApi de status 0', async ({ page }) => {
    await page.route(`${SPRING}/auth/**`, (rota) => rota.abort());

    expect(await chamar(page, 'entrarNoServidor', { email: 'a@b.c', senha: 'x' })).toEqual({ ok: false, erroApi: true, status: 0 });
    expect(await chamar(page, 'cadastrarNoServidor', { nome: 'Ana', email: 'a@b.c', senha: 'x' })).toEqual({ ok: false, erroApi: true, status: 0 });
  });
});
