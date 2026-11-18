// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa06-front-spring-auth/spec.md: WEB-02, WEB-03,
// WEB-04, WEB-05 (login), WEB-08, WEB-09, WEB-10, WEB-11 (registration), WEB-17, WEB-18
// and WEB-01/WEB-07 (no call to the mock). The module is imported in a host page and
// Spring is intercepted; failures are reported by error class name.

const SPRING = 'http://127.0.0.1:8081';
const MODULO = '/frontend/servicos/auth.js';

/** Runs `funcao(...argumentos)` from the auth module; reports the value or the error class (and its campos). */
function chamar(page, funcao, ...argumentos) {
  return page.evaluate(async ({ modulo, funcao, argumentos }) => {
    const auth = await import(modulo);
    const { ErroApi } = await import('/frontend/api/cliente.js');
    try {
      return { ok: true, valor: await auth[funcao](...argumentos) };
    } catch (erro) {
      const classe = [auth.CredenciaisInvalidas, auth.EmailEmUso, auth.DadosInvalidos, ErroApi].find((c) => erro instanceof c);
      return { ok: false, erro: classe ? classe.name : String(erro), campos: erro.campos };
    }
  }, { modulo: MODULO, funcao, argumentos });
}

/** Answers every Spring auth request with `status` and `json`, and records the bodies. */
async function responder(page, status, json) {
  const corpos = [];
  await page.route(`${SPRING}/auth/**`, (rota) => {
    corpos.push({ url: rota.request().url(), corpo: rota.request().postDataJSON() });
    return rota.fulfill({ status, json });
  });
  return corpos;
}

test.describe('etapa06-front-spring-auth T5 - auth service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // WEB-02: only id, nome, email; no token and no password.
  test('entrar resolve só com id, nome e e-mail do usuário da resposta', async ({ page }) => {
    await responder(page, 200, { token: 'a.b.c', usuario: { id: 7, nome: 'Davi', email: 'davi@x.com', senha: 'nao-deveria' } });

    expect(await chamar(page, 'entrar', 'davi@x.com', 'segredo123')).toEqual({
      ok: true, valor: { id: 7, nome: 'Davi', email: 'davi@x.com' },
    });
  });

  // WEB-08
  test('cadastrar resolve só com id, nome e e-mail do usuário criado', async ({ page }) => {
    await responder(page, 201, { id: 9, nome: 'Eva', email: 'eva@x.com', senha: 'nao-deveria' });

    expect(await chamar(page, 'cadastrar', { nome: 'Eva', email: 'eva@x.com', senha: 'segredo123' })).toEqual({
      ok: true, valor: { id: 9, nome: 'Eva', email: 'eva@x.com' },
    });
  });

  // WEB-03
  test('um 401 no login rejeita com CredenciaisInvalidas', async ({ page }) => {
    await responder(page, 401, { status: 401, mensagem: 'E-mail ou senha incorretos.', campos: {} });

    expect(await chamar(page, 'entrar', 'ryan@exemplo.com', 'errada')).toEqual({ ok: false, erro: 'CredenciaisInvalidas' });
  });

  // WEB-09
  test('um 409 no cadastro rejeita com EmailEmUso', async ({ page }) => {
    await responder(page, 409, { status: 409, mensagem: 'Este e-mail já está cadastrado.', campos: {} });

    expect(await chamar(page, 'cadastrar', { nome: 'Outro', email: 'ryan@exemplo.com', senha: 'senha1234' })).toEqual({ ok: false, erro: 'EmailEmUso' });
  });

  // WEB-04, WEB-10
  test('um 400 com campos rejeita com DadosInvalidos carregando os campos, no login e no cadastro', async ({ page }) => {
    const campos = { nome: 'm1', senha: 'm2' };
    await responder(page, 400, { status: 400, mensagem: 'Dados inválidos.', campos });

    expect(await chamar(page, 'entrar', 'a@b.c', 'x')).toEqual({ ok: false, erro: 'DadosInvalidos', campos });
    expect(await chamar(page, 'cadastrar', { nome: 'A', email: 'a@b.c', senha: 'x' })).toEqual({ ok: false, erro: 'DadosInvalidos', campos });
  });

  // WEB-05, WEB-11: everything else is a communication failure.
  test('falha de rede rejeita com ErroApi, no login e no cadastro', async ({ page }) => {
    await page.route(`${SPRING}/auth/**`, (rota) => rota.abort());

    expect(await chamar(page, 'entrar', 'ryan@exemplo.com', 'teste123')).toMatchObject({ ok: false, erro: 'ErroApi' });
    expect(await chamar(page, 'cadastrar', { nome: 'Ana', email: 'a@b.c', senha: 'senha1234' })).toMatchObject({ ok: false, erro: 'ErroApi' });
  });

  test('500, 404 e um 400 sem campos rejeitam com ErroApi', async ({ page }) => {
    for (const [status, json] of [[500, {}], [404, {}], [400, { status: 400, mensagem: 'Corpo da requisição inválido.', campos: {} }]]) {
      await page.unroute(`${SPRING}/auth/**`).catch(() => {});
      await responder(page, status, json);
      expect(await chamar(page, 'entrar', 'a@b.c', 'x'), `status ${status}`).toMatchObject({ ok: false, erro: 'ErroApi' });
    }
  });

  // WEB-17, WEB-18: the server normalises, so the module sends exactly what it received.
  test('entrar e cadastrar enviam nome, e-mail e senha sem aparar nem mudar a caixa', async ({ page }) => {
    const corpos = await responder(page, 200, { token: 't', usuario: { id: 1, nome: 'A', email: 'a@b.c' } });

    await chamar(page, 'entrar', '  Ryan@Exemplo.COM ', '  teste 123  ');
    await chamar(page, 'cadastrar', { nome: '  Ana ', email: '  Ana@X.COM ', senha: '  senha 1234  ' });

    expect(corpos.map((c) => c.corpo)).toEqual([
      { email: '  Ryan@Exemplo.COM ', senha: '  teste 123  ' },
      { nome: '  Ana ', email: '  Ana@X.COM ', senha: '  senha 1234  ' },
    ]);
  });

  // WEB-01, WEB-07
  test('nem entrar nem cadastrar chamam o mock na porta 3000', async ({ page }) => {
    await responder(page, 200, { token: 't', usuario: { id: 1, nome: 'A', email: 'a@b.c' } });
    const paraOMock = [];
    page.on('request', (req) => { if (req.url().startsWith('http://127.0.0.1:3000')) paraOMock.push(req.url()); });

    await chamar(page, 'entrar', 'a@b.c', 'x');
    await chamar(page, 'cadastrar', { nome: 'Ana', email: 'a@b.c', senha: 'senha1234' });

    expect(paraOMock).toEqual([]);
  });

  // WEB-03 versus WEB-05: a wrong password is not a communication failure.
  test('um 401 não vira ErroApi e uma falha de rede não vira CredenciaisInvalidas', async ({ page }) => {
    await responder(page, 401, {});
    const aCredencial = await chamar(page, 'entrar', 'a@b.c', 'x');
    await page.unroute(`${SPRING}/auth/**`);
    await page.route(`${SPRING}/auth/**`, (rota) => rota.abort());
    const aRede = await chamar(page, 'entrar', 'a@b.c', 'x');

    expect(aCredencial.erro).toBe('CredenciaisInvalidas');
    expect(aRede.erro).toBe('ErroApi');
  });
});
