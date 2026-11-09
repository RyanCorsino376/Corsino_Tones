// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-carrinho/spec.md: ADD-*, HDR-02,
// EDGE-01 (T3) and PAGC-*, HDR-01 for carrinho.html, EDGE-02 (T4).

const API = 'http://127.0.0.1:3000';
const CHAVE = 'corsino:carrinho';

const lerCarrinho = (page) => page.evaluate((chave) => localStorage.getItem(chave), CHAVE);
const contador = (page) => page.locator('.acoes-cabecalho .carrinho-texto');

/** Stores cart ids in this origin before the page under test opens. */
async function gravarCarrinho(page, ids) {
  await page.goto('index.html');
  await page.evaluate(([chave, valor]) => localStorage.setItem(chave, valor), [CHAVE, JSON.stringify(ids)]);
}

const botaoAdicionar = (page) => page.getByRole('button', { name: 'Adicionar ao carrinho' });
const linkNoCarrinho = (page) => page.getByRole('link', { name: 'No carrinho' });

test.describe('etapa05-carrinho T3 - add to cart on the pack page', () => {
  // ADD-01
  test('um pack fora do carrinho mostra o botão "Adicionar ao carrinho"', async ({ page }) => {
    await page.goto('pack.html?id=rock-zoom-g6');
    await expect(page.locator('h1')).toHaveText('Rock · Zoom G6');
    await expect(page.locator('.preset-info').getByRole('button', { name: 'Adicionar ao carrinho' })).toBeVisible();
    await expect(linkNoCarrinho(page)).toHaveCount(0);
  });

  // ADD-02, HDR-02 (add)
  test('adicionar guarda o pack, troca o botão por "No carrinho", avisa e atualiza o contador sem recarregar', async ({ page }) => {
    await page.goto('pack.html?id=rock-zoom-g6');
    await expect(contador(page)).toHaveText('Carrinho (0)');
    await page.evaluate(() => { window.semRecarregar = true; });

    await botaoAdicionar(page).click();

    expect(await lerCarrinho(page)).toBe('["rock-zoom-g6"]');
    await expect(linkNoCarrinho(page)).toHaveAttribute('href', 'carrinho.html');
    await expect(botaoAdicionar(page)).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Pack adicionado ao carrinho.' })).toHaveText('Pack adicionado ao carrinho.');
    await expect(contador(page)).toHaveText('Carrinho (1)');
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    await expect(page).toHaveURL(/pack\.html\?id=rock-zoom-g6$/);
  });

  // ADD-03
  test('depois de recarregar, o pack já adicionado continua como "No carrinho"', async ({ page }) => {
    await page.goto('pack.html?id=rock-zoom-g6');
    await botaoAdicionar(page).click();
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Rock · Zoom G6');
    await expect(linkNoCarrinho(page)).toBeVisible();
    await expect(botaoAdicionar(page)).toHaveCount(0);
  });

  // EDGE-01, ADD-03: added elsewhere (another tab) before the page opened.
  test('um pack adicionado em outra aba aparece como "No carrinho"', async ({ page }) => {
    await gravarCarrinho(page, ['metal-nux-mg-30']);
    await page.goto('pack.html?id=metal-nux-mg-30');
    await expect(page.locator('h1')).toHaveText('Metal · NUX MG-30');
    await expect(linkNoCarrinho(page)).toBeVisible();
    await expect(contador(page)).toHaveText('Carrinho (1)');
  });

  // ADD-04. The second click of a double click lands on the "No carrinho" link
  // that replaced the button and opens the cart; the pack is still stored once.
  test('um clique duplo guarda o pack uma vez só', async ({ page }) => {
    await page.goto('pack.html?id=clean-nux-mg-30');
    await botaoAdicionar(page).dblclick();
    await page.waitForURL(/\/frontend\/carrinho\.html$/);
    expect(await lerCarrinho(page)).toBe('["clean-nux-mg-30"]');
  });

  // ADD-04: adding a second pack keeps both, once each.
  test('dois packs diferentes entram no carrinho, cada um uma vez', async ({ page }) => {
    await page.goto('pack.html?id=clean-nux-mg-30');
    await botaoAdicionar(page).click();
    await page.goto('pack.html?id=rock-boss-gt-1000');
    await botaoAdicionar(page).click();
    expect(await lerCarrinho(page)).toBe('["clean-nux-mg-30","rock-boss-gt-1000"]');
    await expect(contador(page)).toHaveText('Carrinho (2)');
  });

  // ADD-05: not found, loading and error show neither the button nor the link.
  test('"Pack não encontrado." não mostra botão nem link do carrinho', async ({ page }) => {
    await page.goto('pack.html?id=jazz');
    await expect(page.getByText('Pack não encontrado.', { exact: true })).toBeVisible();
    await expect(botaoAdicionar(page)).toHaveCount(0);
    await expect(linkNoCarrinho(page)).toHaveCount(0);
  });

  test('enquanto carrega e em erro, não há botão nem link do carrinho', async ({ page }) => {
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs/rock-zoom-g6`, async (rota) => { await liberado; await rota.abort(); });
    await page.goto('pack.html?id=rock-zoom-g6');
    await expect(page.getByRole('status').filter({ hasText: 'Carregando pack...' })).toBeVisible();
    await expect(botaoAdicionar(page)).toBeHidden();
    await expect(linkNoCarrinho(page)).toBeHidden();

    liberar();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(botaoAdicionar(page)).toBeHidden();
    await expect(linkNoCarrinho(page)).toBeHidden();
  });
});
