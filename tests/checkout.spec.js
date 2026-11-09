// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-checkout/spec.md: CK-* (T2),
// ACC-*, RES-* (T3), FORM-* (T4), PAY-*, PED-*, OK-*, EDGE-01 (T5).

const API = 'http://127.0.0.1:3000';
const CHAVE_CARRINHO = 'corsino:carrinho';
const SESSAO_RYAN = '{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}';
const formatoBRL = (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

/** Stores the cart (and optionally a session) before the page under test opens. */
async function preparar(page, { carrinho = [], sessao = false } = {}) {
  await page.goto('login.html');
  await page.evaluate(([chave, valor, sessaoJson]) => {
    localStorage.setItem(chave, valor);
    if (sessaoJson) sessionStorage.setItem('corsino:sessao', sessaoJson);
  }, [CHAVE_CARRINHO, JSON.stringify(carrinho), sessao ? SESSAO_RYAN : null]);
}

const finalizar = (page) => page.getByRole('link', { name: 'Finalizar compra' });

test.describe('etapa05-checkout T2 - Finalizar compra on the cart page', () => {
  // CK-01, CK-02
  test('com packs o carrinho mostra "Finalizar compra"; ao esvaziar, some', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    await page.goto('carrinho.html');
    await expect(finalizar(page)).toBeVisible();
    await expect(finalizar(page)).toHaveAttribute('href', 'checkout.html');

    await page.getByRole('button', { name: 'Remover' }).click();
    await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible();
    await expect(finalizar(page)).toBeHidden();
  });

  // CK-02: not while loading or in error.
  test('enquanto carrega e em erro não há "Finalizar compra"', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs`, async (rota) => { await liberado; await rota.abort(); });
    await page.goto('carrinho.html');
    await expect(page.getByRole('status').filter({ hasText: 'Carregando carrinho...' })).toBeVisible();
    // The link exists in the page (inside the hidden list), so "hidden" is not vacuous (lesson L-001).
    await expect(page.locator('a.finalizar')).toHaveCount(1);
    await expect(page.locator('a.finalizar')).toBeHidden();
    liberar();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('a.finalizar')).toBeHidden();
  });
});
