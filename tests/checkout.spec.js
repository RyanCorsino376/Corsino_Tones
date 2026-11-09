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

const formulario = (page) => page.locator('#form-pagamento');
const dialogo = (page) => page.getByRole('dialog');

/** Packs as the API serves them, by id. */
async function packsPorId(page) {
  const packs = await page.request.get(`${API}/packs`).then((r) => r.json());
  return Object.fromEntries(packs.map((p) => [p.id, p]));
}

test.describe('etapa05-checkout T3 - session required', () => {
  // ACC-01: pop-up, no form, no request, and the page never moves by itself (lessons L-009, L-010).
  test('sem sessão, o checkout abre o pop-up de login, sem formulário nem requisição, e não sai sozinho', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    await page.clock.install();
    const pedidos = [];
    page.on('request', (req) => { if (req.url().startsWith(API)) pedidos.push(req.url()); });
    await page.goto('checkout.html');

    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page)).toContainText('Faça login para finalizar a compra');
    expect(await dialogo(page).evaluate((el) => el.matches(':modal'))).toBe(true);
    await expect(formulario(page)).toHaveCount(1);
    await expect(formulario(page)).toBeHidden();

    await page.clock.runFor(60_000);
    await expect(page).toHaveURL(/\/frontend\/checkout\.html$/);
    expect(await page.locator('meta[http-equiv="refresh" i]').count()).toBe(0);
    expect(pedidos).toEqual([]);
  });

  // ACC-02
  test('"Fazer login" leva a login.html?voltar=checkout.html', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    await page.goto('checkout.html');
    await dialogo(page).getByRole('button', { name: 'Fazer login' }).click();
    await expect(page).toHaveURL(/\/frontend\/login\.html\?voltar=checkout\.html$/);
  });

  // ACC-03
  for (const [como, agir] of [
    ['"Voltar"', (page) => dialogo(page).getByRole('button', { name: 'Voltar' }).click()],
    ['Esc', (page) => page.keyboard.press('Escape')],
  ]) {
    test(`${como} no pop-up do checkout volta ao carrinho`, async ({ page }) => {
      await preparar(page, { carrinho: ['rock-zoom-g6'] });
      await page.goto('checkout.html');
      await expect(dialogo(page)).toBeVisible();
      await agir(page);
      await expect(page).toHaveURL(/\/frontend\/carrinho\.html$/);
    });
  }

  // ACC-04
  test('depois de entrar pelo pop-up, o checkout abre com o carrinho intacto', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6', 'clean-nux-mg-30'] });
    await page.goto('checkout.html');
    await dialogo(page).getByRole('button', { name: 'Fazer login' }).click();
    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    await page.locator('#form-login button[type="submit"]').click();

    await expect(page).toHaveURL(/\/frontend\/checkout\.html$/);
    await expect(page.locator('.itens-checkout li')).toHaveCount(2);
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6","clean-nux-mg-30"]');
  });
});

test.describe('etapa05-checkout T3 - order summary', () => {
  // RES-01
  test('lista os packs na ordem do carrinho, com preço e total, e mostra o formulário com "Pagar {total}"', async ({ page }) => {
    const porId = await packsPorId(page);
    await preparar(page, { carrinho: ['clean-nux-mg-30', 'rock-zoom-g6'], sessao: true });
    const pedido = page.waitForRequest(`${API}/packs`);
    await page.goto('checkout.html');
    await pedido;

    const itens = page.locator('.itens-checkout li');
    await expect(itens).toHaveCount(2);
    for (const [i, id] of ['clean-nux-mg-30', 'rock-zoom-g6'].entries()) {
      await expect(itens.nth(i)).toContainText(porId[id].nome);
      await expect(itens.nth(i).locator('.item-preco')).toHaveText(formatoBRL(porId[id].precoCentavos));
    }
    const total = formatoBRL(porId['clean-nux-mg-30'].precoCentavos + porId['rock-zoom-g6'].precoCentavos);
    await expect(page.locator('.checkout-resumo .total-carrinho')).toHaveText(`Total: ${total}`);
    await expect(formulario(page)).toBeVisible();
    await expect(formulario(page).locator('button[type="submit"]')).toHaveText(`Pagar ${total}`);
  });

  // RES-02
  test('com o carrinho vazio mostra o estado vazio, sem formulário nem requisição', async ({ page }) => {
    await preparar(page, { carrinho: [], sessao: true });
    const pedidos = [];
    page.on('request', (req) => { if (req.url().startsWith(API)) pedidos.push(req.url()); });
    await page.goto('checkout.html');
    await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver os packs' })).toHaveAttribute('href', 'packs.html');
    await expect(formulario(page)).toHaveCount(1);
    await expect(formulario(page)).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(pedidos).toEqual([]);
  });

  // RES-03
  test('um pack que não existe mais é tirado do carrinho, com aviso', async ({ page }) => {
    await preparar(page, { carrinho: ['jazz-boss-x', 'rock-zoom-g6'], sessao: true });
    await page.goto('checkout.html');
    await expect(page.getByText('Um pack do seu carrinho não está mais disponível e foi removido.', { exact: true })).toBeVisible();
    await expect(page.locator('.itens-checkout li')).toHaveCount(1);
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6"]');
  });

  // RES-05
  test('enquanto carrega mostra "Carregando carrinho..." e nenhum formulário', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'], sessao: true });
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs`, async (rota) => { await liberado; await rota.continue(); });
    await page.goto('checkout.html');
    await expect(page.getByRole('status').filter({ hasText: 'Carregando carrinho...' })).toBeVisible();
    await expect(formulario(page)).toHaveCount(1);
    await expect(formulario(page)).toBeHidden();
    liberar();
    await expect(formulario(page)).toBeVisible();
  });

  // RES-04
  test('falha ao carregar mostra o erro com "Tentar novamente" e nenhum formulário', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'], sessao: true });
    let tentativas = 0;
    await page.route(`${API}/packs`, (rota) => {
      tentativas += 1;
      return tentativas === 1 ? rota.abort() : rota.continue();
    });
    await page.goto('checkout.html');
    const alerta = page.getByRole('alert');
    await expect(alerta.locator('p')).toHaveText('Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente.');
    await expect(formulario(page)).toBeHidden();
    await alerta.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(formulario(page)).toBeVisible();
  });
});
