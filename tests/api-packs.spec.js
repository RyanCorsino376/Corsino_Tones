// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-packs/spec.md (PACK-*, PAG-01,
// PAG-06 at the API layer). Modules are imported in a host page.

const API = 'http://127.0.0.1:3000';

/** Runs `funcao(argumento)` from `modulo` in the page; reports the value or whether it was an ErroApi. */
function chamar(page, modulo, funcao, argumento) {
  return page.evaluate(async ({ modulo, funcao, argumento }) => {
    const api = await import(modulo);
    const { ErroApi } = await import('/frontend/api/cliente.js');
    try {
      return { ok: true, valor: await api[funcao](argumento) };
    } catch (erro) {
      return { ok: false, erroApi: erro instanceof ErroApi };
    }
  }, { modulo, funcao, argumento });
}

test.describe('etapa05-packs T1 - packs API module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // PACK-01
  test('listarPacks devolve os 9 packs da API', async ({ page }) => {
    const esperado = await page.request.get(`${API}/packs`).then((r) => r.json());
    const resultado = await chamar(page, '/frontend/api/packs.js', 'listarPacks');
    expect(resultado.ok).toBe(true);
    expect(esperado).toHaveLength(9);
    expect(resultado.valor).toEqual(esperado);
  });

  // PACK-01: a body that is not a list is a communication failure.
  test('listarPacks rejeita com ErroApi quando o corpo não é lista', async ({ page }) => {
    await page.route(`${API}/packs`, (rota) => rota.fulfill({ json: { packs: [] } }));
    expect(await chamar(page, '/frontend/api/packs.js', 'listarPacks')).toEqual({ ok: false, erroApi: true });
  });

  // PACK-02, PAG-01
  test('buscarPack devolve o pack pedido', async ({ page }) => {
    const resultado = await chamar(page, '/frontend/api/packs.js', 'buscarPack', 'metal-nux-mg-30');
    expect(resultado.ok).toBe(true);
    expect(resultado.valor).toMatchObject({ id: 'metal-nux-mg-30', nome: 'Metal · NUX MG-30', precoCentavos: 4990 });
  });

  // PACK-02, PAG-06: 404 is "not found", not a failure.
  test('buscarPack devolve null para um pack que não existe', async ({ page }) => {
    expect(await chamar(page, '/frontend/api/packs.js', 'buscarPack', 'jazz')).toEqual({ ok: true, valor: null });
  });

  // PAG-07 (API half): other failures are communication errors.
  test('buscarPack rejeita com ErroApi em falha de rede', async ({ page }) => {
    await page.route(`${API}/packs/metal-nux-mg-30`, (rota) => rota.abort());
    expect(await chamar(page, '/frontend/api/packs.js', 'buscarPack', 'metal-nux-mg-30')).toEqual({ ok: false, erroApi: true });
  });

  // PAG-01 (rev. 2): the presets of one pack come from GET /presets?packId=.
  test('listarPresetsDoPack pede GET /presets?packId= e devolve só os presets daquele pack', async ({ page }) => {
    const todos = await page.request.get(`${API}/presets`).then((r) => r.json());
    const esperado = todos.filter((p) => p.packId === 'rock-boss-gt-1000');
    expect(esperado).toHaveLength(3);

    const pedido = page.waitForRequest((req) => req.url().startsWith(`${API}/presets?`));
    const resultado = await chamar(page, '/frontend/api/presets.js', 'listarPresetsDoPack', 'rock-boss-gt-1000');
    expect(new URL((await pedido).url()).search).toBe('?packId=rock-boss-gt-1000');
    expect(resultado.ok).toBe(true);
    expect(resultado.valor.map((p) => p.id).sort((a, b) => a - b)).toEqual(esperado.map((p) => p.id).sort((a, b) => a - b));
  });
});
