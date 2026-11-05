// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-api-modulos/spec.md: LOAD-*, ERR-01..06,
// ERR-08 and EDGE-01..02. page.route holds or breaks the catalogue request so
// each state can be observed for as long as the test needs.

const URL_PRESETS = 'http://127.0.0.1:3000/presets';
const CARREGANDO = 'Carregando presets...';

/** Holds every catalogue request until the returned function is called. */
async function segurarCatalogo(page) {
  let liberar;
  const liberado = new Promise((resolver) => { liberar = resolver; });
  await page.route(URL_PRESETS, async (rota) => {
    await liberado;
    await rota.continue();
  });
  return liberar;
}

/** Names of the catalogue entries accepted by `regra`, read from the API. */
async function nomesOnde(page, regra) {
  const resposta = await page.request.get(URL_PRESETS);
  return (await resposta.json()).filter(regra).map((p) => p.nome);
}

const avisoCarregando = (page) => page.getByRole('status').filter({ hasText: CARREGANDO });

test.describe('etapa05 T4 - loading state on presets.html', () => {
  // LOAD-01, LOAD-04
  test('enquanto a requisição está pendente, mostra "Carregando presets..." e nada da lista', async ({ page }) => {
    await segurarCatalogo(page);
    await page.goto('presets.html');

    await expect(avisoCarregando(page)).toHaveText(CARREGANDO);
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
    await expect(page.locator('#contagem')).toHaveText('');
    await expect(page.locator('.lista-vazia')).toBeHidden();
  });

  // LOAD-03 (success half)
  test('quando a resposta chega, o aviso some e os 9 cards aparecem', async ({ page }) => {
    const liberar = await segurarCatalogo(page);
    await page.goto('presets.html');
    await expect(avisoCarregando(page)).toBeVisible();

    liberar();

    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
    await expect(avisoCarregando(page)).toHaveCount(0);
    await expect(page.locator('#contagem')).toHaveText('9 presets encontrados');
  });

  // EDGE-01
  test('um filtro marcado durante o carregamento é aplicado quando os dados chegam', async ({ page }) => {
    const liberar = await segurarCatalogo(page);
    await page.goto('presets.html');
    await expect(avisoCarregando(page)).toBeVisible();

    await page.locator('#marca-boss').check();
    liberar();

    const esperado = await nomesOnde(page, (p) => p.marca === 'boss');
    expect(esperado.length).toBeGreaterThan(0);
    expect(esperado.length).toBeLessThan(9);
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(esperado.length);
    const nomes = (await page.locator('.grade-presets .cartao-nome').allTextContents()).map((n) => n.trim());
    expect(nomes.sort()).toEqual(esperado.sort());
  });
});

const MENSAGEM_ERRO = 'Não foi possível carregar os presets. Verifique sua conexão e tente novamente.';

/** Asserts the error state of presets.html: message, button, and nothing of the list. */
async function esperarEstadoDeErro(page) {
  const alerta = page.getByRole('alert');
  await expect(alerta).toHaveCount(1);
  await expect(alerta.locator('p')).toHaveText(MENSAGEM_ERRO);
  await expect(alerta.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(1);
  await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
  await expect(page.locator('#contagem')).toHaveText('');
  await expect(page.locator('.lista-vazia')).toBeHidden();
  await expect(avisoCarregando(page)).toHaveCount(0);
}

test.describe('etapa05 T5 - error state and retry on presets.html', () => {
  // ERR-01, ERR-06, LOAD-03 (failure half)
  test('falha de rede mostra a mensagem de erro e "Tentar novamente"', async ({ page }) => {
    await page.route(URL_PRESETS, (rota) => rota.abort());
    await page.goto('presets.html');
    await esperarEstadoDeErro(page);
  });

  // ERR-02, ERR-06
  test('resposta 500 mostra a mesma mensagem de erro', async ({ page }) => {
    await page.route(URL_PRESETS, (rota) => rota.fulfill({ status: 500, json: [] }));
    await page.goto('presets.html');
    await esperarEstadoDeErro(page);
  });

  // ERR-04, ERR-06
  test('corpo que não é uma lista mostra a mesma mensagem de erro', async ({ page }) => {
    await page.route(URL_PRESETS, (rota) => rota.fulfill({ json: { presets: [] } }));
    await page.goto('presets.html');
    await esperarEstadoDeErro(page);
  });

  // ERR-03, ERR-06
  test('sem resposta em 8000 ms a requisição é abortada e o erro aparece', async ({ page }) => {
    // An installed clock keeps ticking in real time; pausing it makes runFor() exact.
    await page.clock.install({ time: new Date('2026-11-05T10:00:00') });
    await page.clock.pauseAt(new Date('2026-11-05T10:00:01'));
    await page.route(URL_PRESETS, () => {});
    const pedido = page.waitForRequest(URL_PRESETS);
    await page.goto('presets.html');
    await pedido;

    await page.clock.runFor(7999);
    await expect(avisoCarregando(page)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.clock.runFor(2);
    await esperarEstadoDeErro(page);
  });

  // ERR-05
  test('"Tentar novamente" mostra o carregamento, repete a requisição e carrega a lista', async ({ page }) => {
    let tentativas = 0;
    let liberarSegunda;
    const segundaLiberada = new Promise((resolver) => { liberarSegunda = resolver; });
    await page.route(URL_PRESETS, async (rota) => {
      tentativas += 1;
      if (tentativas === 1) return rota.abort();
      await segundaLiberada;
      return rota.continue();
    });
    await page.goto('presets.html');
    await esperarEstadoDeErro(page);

    await page.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(avisoCarregando(page)).toHaveText(CARREGANDO);
    await expect.poll(() => tentativas).toBe(2);

    liberarSegunda();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
    await expect(page.locator('#contagem')).toHaveText('9 presets encontrados');
    await expect(avisoCarregando(page)).toHaveCount(0);
  });

  // EDGE-02
  test('duas falhas seguidas deixam exatamente uma mensagem e um botão', async ({ page }) => {
    let tentativas = 0;
    await page.route(URL_PRESETS, (rota) => {
      tentativas += 1;
      return rota.abort();
    });
    await page.goto('presets.html');
    await esperarEstadoDeErro(page);

    await page.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect.poll(() => tentativas).toBe(2);
    await esperarEstadoDeErro(page);
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toHaveCount(1);
  });
});
