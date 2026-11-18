// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-api-modulos/spec.md: API-02 (client
// half), ERR-01..04 (which failures count as errors) and ERR-07 (logging).
// The API module is imported inside a real page, so it runs exactly as the
// pages will run it. login.html is used only as a host page: it loads no API code.

const URL_PRESETS = 'http://127.0.0.1:3000/presets';
const MODULO = '/frontend/api/presets.js';

/** Collects the console.error lines written by the API layer ("[api] ..."). */
function registrosDeErro(page) {
  const linhas = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().startsWith('[api]')) linhas.push(msg.text());
  });
  return linhas;
}

/** Calls listarPresets() in the page and reports how the promise settled. */
function chamarListarPresets(page) {
  return page.evaluate(async (modulo) => {
    const api = await import(modulo);
    const { ErroApi } = await import('/frontend/api/cliente.js');
    try {
      return { ok: true, dados: await api.listarPresets() };
    } catch (erro) {
      return { ok: false, erroApi: erro instanceof ErroApi, status: erro.status };
    }
  }, MODULO);
}

test.describe('T2 - cliente da API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // API-02
  test('listarPresets resolve com os 21 presets do mock, sem registrar erro', async ({ page }) => {
    const erros = registrosDeErro(page);
    const resultado = await chamarListarPresets(page);
    expect(resultado.ok).toBe(true);
    expect(resultado.dados).toHaveLength(21);
    expect(resultado.dados.map((p) => p.id).sort((a, b) => a - b)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    expect(erros).toHaveLength(0);
  });

  // ERR-01, ERR-07
  test('falha de rede vira ErroApi com status 0 e registra um console.error', async ({ page }) => {
    const erros = registrosDeErro(page);
    await page.route(URL_PRESETS, (rota) => rota.abort());
    expect(await chamarListarPresets(page)).toEqual({ ok: false, erroApi: true, status: 0 });
    await expect.poll(() => erros.length).toBe(1);
  });

  // ERR-02, ERR-07
  test('resposta 500 vira ErroApi com status 500 e registra um console.error', async ({ page }) => {
    const erros = registrosDeErro(page);
    await page.route(URL_PRESETS, (rota) => rota.fulfill({ status: 500, body: '[]', contentType: 'application/json' }));
    expect(await chamarListarPresets(page)).toEqual({ ok: false, erroApi: true, status: 500 });
    await expect.poll(() => erros.length).toBe(1);
  });

  // ERR-04, ERR-07
  test('corpo que não é JSON vira ErroApi e registra um console.error', async ({ page }) => {
    const erros = registrosDeErro(page);
    await page.route(URL_PRESETS, (rota) => rota.fulfill({ status: 200, body: '<html>oops</html>', contentType: 'text/html' }));
    const resultado = await chamarListarPresets(page);
    expect(resultado.ok).toBe(false);
    expect(resultado.erroApi).toBe(true);
    await expect.poll(() => erros.length).toBe(1);
  });

  // ERR-04, ERR-07
  test('JSON que não é uma lista vira ErroApi e registra um console.error', async ({ page }) => {
    const erros = registrosDeErro(page);
    await page.route(URL_PRESETS, (rota) => rota.fulfill({ status: 200, json: { presets: [] } }));
    const resultado = await chamarListarPresets(page);
    expect(resultado.ok).toBe(false);
    expect(resultado.erroApi).toBe(true);
    await expect.poll(() => erros.length).toBe(1);
  });

  // ERR-03, ERR-07
  test('sem resposta em 8000 ms a requisição é abortada e vira ErroApi com status 0', async ({ page }) => {
    const erros = registrosDeErro(page);
    // An installed clock keeps ticking in real time; pausing it makes runFor() exact.
    await page.clock.install({ time: new Date('2026-11-05T10:00:00') });
    await page.clock.pauseAt(new Date('2026-11-05T10:00:01'));
    // The handler never answers, so only the client's own timeout can end the request.
    await page.route(URL_PRESETS, () => {});
    const pedido = page.waitForRequest(URL_PRESETS);
    await page.evaluate(async (modulo) => {
      const api = await import(modulo);
      window.resultadoTimeout = 'pendente';
      api.listarPresets().then(
        () => { window.resultadoTimeout = 'resolveu'; },
        (erro) => { window.resultadoTimeout = { nome: erro.name, status: erro.status }; },
      );
    }, MODULO);
    await pedido;

    await page.clock.runFor(7999);
    expect(await page.evaluate(() => window.resultadoTimeout)).toBe('pendente');

    await page.clock.runFor(2);
    await expect.poll(() => page.evaluate(() => window.resultadoTimeout)).toEqual({ nome: 'ErroApi', status: 0 });
    await expect.poll(() => erros.length).toBe(1);
  });
});

// etapa06-front-spring-auth T3: WEB-01 (the call goes to the chosen server), WEB-04
// (the body of an error answer reaches the caller), WEB-05 (limit and log still apply).
test.describe('etapa06 T3 - servidor escolhido e corpo do erro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  /** Runs requisicao() in the page and reports the outcome, including status and corpo of an ErroApi. */
  function chamarRequisicao(page, caminho, opcoes) {
    return page.evaluate(async ({ caminho, opcoes }) => {
      const { requisicao, ErroApi } = await import('/frontend/api/cliente.js');
      try {
        return { ok: true, dados: await requisicao(caminho, opcoes) };
      } catch (erro) {
        return { ok: false, erroApi: erro instanceof ErroApi, status: erro.status, corpo: erro.corpo };
      }
    }, { caminho, opcoes });
  }

  // WEB-01
  test('com servidor "spring" a requisição vai para a porta 8081', async ({ page }) => {
    await page.route('http://127.0.0.1:8081/auth/x', (rota) => rota.fulfill({ json: { de: 'spring' } }));
    const pedido = page.waitForRequest('http://127.0.0.1:8081/auth/x');

    expect(await chamarRequisicao(page, '/auth/x', { servidor: 'spring' })).toEqual({ ok: true, dados: { de: 'spring' } });
    expect((await pedido).url()).toBe('http://127.0.0.1:8081/auth/x');
  });

  // WEB-01: the default stays the mock.
  test('sem a opção servidor a requisição continua indo para o mock na porta 3000', async ({ page }) => {
    await page.route('http://127.0.0.1:3000/x', (rota) => rota.fulfill({ json: { de: 'mock' } }));

    expect(await chamarRequisicao(page, '/x')).toEqual({ ok: true, dados: { de: 'mock' } });
  });

  // WEB-01: "servidor" is an option of requisicao, not something fetch should receive.
  test('a opção servidor não é repassada ao fetch', async ({ page }) => {
    await page.route('http://127.0.0.1:8081/auth/x', (rota) => rota.fulfill({ json: {} }));
    const chaves = await page.evaluate(async () => {
      const { requisicao } = await import('/frontend/api/cliente.js');
      const original = window.fetch;
      let recebidas = null;
      window.fetch = (url, init) => { recebidas = Object.keys(init); return original(url, init); };
      await requisicao('/auth/x', { servidor: 'spring', method: 'POST' });
      window.fetch = original;
      return recebidas;
    });

    expect(chaves).toContain('method');
    expect(chaves).not.toContain('servidor');
  });

  // WEB-04
  test('um 400 com corpo JSON vira ErroApi com status 400 e o corpo em erro.corpo', async ({ page }) => {
    await page.route('http://127.0.0.1:8081/auth/x', (rota) => rota.fulfill({
      status: 400, json: { status: 400, mensagem: 'Dados inválidos.', campos: { email: 'm' } },
    }));

    expect(await chamarRequisicao(page, '/auth/x', { servidor: 'spring' })).toEqual({
      ok: false, erroApi: true, status: 400, corpo: { status: 400, mensagem: 'Dados inválidos.', campos: { email: 'm' } },
    });
  });

  // WEB-04, WEB-05: a body that is not JSON leaves corpo null and the error is still an ErroApi.
  test('um 500 com corpo que não é JSON vira ErroApi com corpo null', async ({ page }) => {
    await page.route('http://127.0.0.1:8081/auth/x', (rota) => rota.fulfill({ status: 500, body: 'erro html', contentType: 'text/html' }));

    expect(await chamarRequisicao(page, '/auth/x', { servidor: 'spring' })).toEqual({
      ok: false, erroApi: true, status: 500, corpo: null,
    });
  });

  // WEB-05, ERR-07: a failed Spring call is still one ErroApi and one console.error line.
  test('falha de rede numa chamada ao Spring vira ErroApi com status 0 e registra um console.error', async ({ page }) => {
    const erros = registrosDeErro(page);
    await page.route('http://127.0.0.1:8081/auth/x', (rota) => rota.abort());

    expect(await chamarRequisicao(page, '/auth/x', { servidor: 'spring' })).toEqual({
      ok: false, erroApi: true, status: 0, corpo: null,
    });
    await expect.poll(() => erros.length).toBe(1);
  });
});
