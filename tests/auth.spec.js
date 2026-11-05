// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-auth/spec.md: AUTH-03, AUTH-04 and
// CAD-03 (the rules), CAD-02 (normalisation) and EDGE-01. The module is
// imported in a host page; failures are reported by error class name.

const API = 'http://127.0.0.1:3000';
const MODULO = '/frontend/servicos/auth.js';
const USUARIO_SEMENTE = { id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com', senha: 'teste123' };

const emailUnico = () => `teste-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemplo.com`;

/** Runs `funcao(...argumentos)` from the auth module; reports the value or the error class. */
function chamar(page, funcao, ...argumentos) {
  return page.evaluate(async ({ modulo, funcao, argumentos }) => {
    const auth = await import(modulo);
    const { ErroApi } = await import('/frontend/api/cliente.js');
    try {
      return { ok: true, valor: await auth[funcao](...argumentos) };
    } catch (erro) {
      const classe = [auth.CredenciaisInvalidas, auth.EmailEmUso, ErroApi].find((c) => erro instanceof c);
      return { ok: false, erro: classe ? classe.name : String(erro) };
    }
  }, { modulo: MODULO, funcao, argumentos });
}

test.describe('etapa05-auth T4 - auth service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // AUTH-03
  test('entrar com e-mail e senha corretos devolve o usuário', async ({ page }) => {
    expect(await chamar(page, 'entrar', 'ryan@exemplo.com', 'teste123')).toEqual({ ok: true, valor: USUARIO_SEMENTE });
  });

  // EDGE-01
  test('entrar ignora maiúsculas e espaços em volta do e-mail', async ({ page }) => {
    expect(await chamar(page, 'entrar', '  Ryan@Exemplo.COM ', 'teste123')).toEqual({ ok: true, valor: USUARIO_SEMENTE });
  });

  // AUTH-04
  test('senha errada rejeita com CredenciaisInvalidas', async ({ page }) => {
    expect(await chamar(page, 'entrar', 'ryan@exemplo.com', 'teste124')).toEqual({ ok: false, erro: 'CredenciaisInvalidas' });
  });

  // AUTH-03 "senha equals": the comparison is exact, so case matters (Verifier gap, M02).
  test('a senha com outra capitalização rejeita com CredenciaisInvalidas', async ({ page }) => {
    expect(await chamar(page, 'entrar', 'ryan@exemplo.com', 'TESTE123')).toEqual({ ok: false, erro: 'CredenciaisInvalidas' });
  });

  // AUTH-04
  test('e-mail sem conta rejeita com CredenciaisInvalidas', async ({ page }) => {
    expect(await chamar(page, 'entrar', emailUnico(), 'teste123')).toEqual({ ok: false, erro: 'CredenciaisInvalidas' });
  });

  // AUTH-05 (rule half): a failure to communicate is not a wrong password.
  test('falha de comunicação rejeita com ErroApi', async ({ page }) => {
    await page.route(`${API}/usuarios?**`, (rota) => rota.abort());
    expect(await chamar(page, 'entrar', 'ryan@exemplo.com', 'teste123')).toEqual({ ok: false, erro: 'ErroApi' });
  });

  // CAD-02
  test('cadastrar normaliza nome e e-mail antes de enviar', async ({ page }) => {
    const email = emailUnico();
    const pedido = page.waitForRequest((req) => req.url() === `${API}/usuarios` && req.method() === 'POST');

    const resultado = await chamar(page, 'cadastrar', { nome: '  Ana ', email: `  ${email.toUpperCase()} `, senha: 'senha1234' });

    expect((await pedido).postDataJSON()).toEqual({ nome: 'Ana', email, senha: 'senha1234' });
    expect(resultado.ok).toBe(true);
    expect(resultado.valor).toMatchObject({ nome: 'Ana', email, senha: 'senha1234' });
  });

  // CAD-03
  test('cadastrar com um e-mail já usado rejeita com EmailEmUso e não envia POST', async ({ page }) => {
    const posts = [];
    page.on('request', (req) => { if (req.method() === 'POST') posts.push(req.url()); });

    const resultado = await chamar(page, 'cadastrar', { nome: 'Outro', email: 'RYAN@exemplo.com', senha: 'senha1234' });

    expect(resultado).toEqual({ ok: false, erro: 'EmailEmUso' });
    expect(posts).toEqual([]);
  });
});
