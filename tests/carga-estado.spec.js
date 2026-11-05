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
