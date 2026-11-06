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
  test('listarPacks devolve os 4 packs', async ({ page }) => {
    const resultado = await chamar(page, '/frontend/api/packs.js', 'listarPacks');
    expect(resultado.ok).toBe(true);
    expect(resultado.valor.map((p) => p.id)).toEqual(['rock', 'blues', 'metal', 'clean']);
  });

  // PACK-01: a body that is not a list is a communication failure.
  test('listarPacks rejeita com ErroApi quando o corpo não é lista', async ({ page }) => {
    await page.route(`${API}/packs`, (rota) => rota.fulfill({ json: { packs: [] } }));
    expect(await chamar(page, '/frontend/api/packs.js', 'listarPacks')).toEqual({ ok: false, erroApi: true });
  });

  // PACK-02, PAG-01
  test('buscarPack devolve o pack pedido', async ({ page }) => {
    const resultado = await chamar(page, '/frontend/api/packs.js', 'buscarPack', 'metal');
    expect(resultado.ok).toBe(true);
    expect(resultado.valor).toMatchObject({ id: 'metal', nome: 'Pack Metal', precoCentavos: 4990 });
  });

  // PACK-02, PAG-06: 404 is "not found", not a failure.
  test('buscarPack devolve null para um pack que não existe', async ({ page }) => {
    expect(await chamar(page, '/frontend/api/packs.js', 'buscarPack', 'jazz')).toEqual({ ok: true, valor: null });
  });

  // PAG-07 (API half): other failures are communication errors.
  test('buscarPack rejeita com ErroApi em falha de rede', async ({ page }) => {
    await page.route(`${API}/packs/metal`, (rota) => rota.abort());
    expect(await chamar(page, '/frontend/api/packs.js', 'buscarPack', 'metal')).toEqual({ ok: false, erroApi: true });
  });

  // PAG-01: the presets of one style come from GET /presets?estilo=.
  test('listarPresetsDoEstilo pede GET /presets?estilo= e devolve só aquele estilo', async ({ page }) => {
    const pedido = page.waitForRequest((req) => req.url().startsWith(`${API}/presets?`));
    const resultado = await chamar(page, '/frontend/api/presets.js', 'listarPresetsDoEstilo', 'rock');
    expect(new URL((await pedido).url()).search).toBe('?estilo=rock');
    expect(resultado.ok).toBe(true);
    expect(resultado.valor.map((p) => p.nome).sort()).toEqual(['Crunch Clássico', 'Hard Rock Anos 80', 'Ápice do Solo'].sort());
  });
});
