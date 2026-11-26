// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-carrinho/spec.md: ADD-*, HDR-02,
// EDGE-01 (T3) and PAGC-*, HDR-01 for carrinho.html, EDGE-02 (T4).

const API = 'http://127.0.0.1:8081';
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

const formatoBRL = (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
const VAZIO = 'Seu carrinho está vazio.';
const AVISO_REMOVIDO = 'Um pack do seu carrinho não está mais disponível e foi removido.';
const CARREGANDO = 'Carregando carrinho...';
const ERRO = 'Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente.';

const itens = (page) => page.locator('.itens-carrinho li');

/** Packs as the API serves them, by id. */
async function packsPorId(page) {
  const packs = await page.request.get(`${API}/packs`).then((r) => r.json());
  return Object.fromEntries(packs.map((p) => [p.id, p]));
}

test.describe('etapa05-carrinho T4 - cart page', () => {
  // PAGC-01, PAGC-02
  test('lista os packs na ordem em que entraram, com link, preço, "Remover", contagem e total', async ({ page }) => {
    const porId = await packsPorId(page);
    await gravarCarrinho(page, ['clean-zoom-g6', 'rock-boss-gt-1000']);
    const pedido = page.waitForRequest(`${API}/packs`);
    await page.goto('carrinho.html');
    await pedido;

    await expect(page.locator('h1')).toHaveText('Carrinho');
    await expect(itens(page)).toHaveCount(2);
    for (const [i, id] of ['clean-zoom-g6', 'rock-boss-gt-1000'].entries()) {
      const item = itens(page).nth(i);
      await expect(item.getByRole('link', { name: porId[id].nome })).toHaveAttribute('href', `pack.html?id=${id}`);
      await expect(item.locator('.item-preco')).toHaveText(formatoBRL(porId[id].precoCentavos));
      await expect(item.getByRole('button', { name: 'Remover' })).toBeVisible();
    }
    await expect(page.locator('#contagem-carrinho')).toHaveText('2 packs no carrinho');
    const soma = porId['clean-zoom-g6'].precoCentavos + porId['rock-boss-gt-1000'].precoCentavos;
    await expect(page.locator('.total-carrinho')).toHaveText(`Total: ${formatoBRL(soma)}`);
  });

  // PAGC-02: the total is the sum of the API prices, in cents (prices that differ prove it).
  test('o total soma os preços que a API devolve, em centavos', async ({ page }) => {
    await gravarCarrinho(page, ['a-1', 'b-2', 'c-3']);
    // Distinct prices, so each line must show its own (Verifier gap M29).
    await page.route(`${API}/packs`, (rota) => rota.fulfill({ json: [
      { id: 'a-1', nome: 'Pack A', estilo: 'rock', marca: 'boss', equipamento: 'X', descricao: 'x', precoCentavos: 1010 },
      { id: 'b-2', nome: 'Pack B', estilo: 'rock', marca: 'boss', equipamento: 'Y', descricao: 'y', precoCentavos: 2020 },
      { id: 'c-3', nome: 'Pack C', estilo: 'rock', marca: 'boss', equipamento: 'Z', descricao: 'z', precoCentavos: 70 },
    ] }));
    await page.goto('carrinho.html');
    await expect(page.locator('.total-carrinho')).toHaveText(`Total: ${formatoBRL(3100)}`);
    await expect(page.locator('#contagem-carrinho')).toHaveText('3 packs no carrinho');
    await expect(page.locator('.itens-carrinho .item-preco')).toHaveText([formatoBRL(1010), formatoBRL(2020), formatoBRL(70)]);
  });

  // PAGC-03, HDR-02 (remove), EDGE-02
  test('"Remover" tira o pack da lista, do total, da contagem, do cabeçalho e do armazenamento, sem recarregar nem pedir de novo', async ({ page }) => {
    const porId = await packsPorId(page);
    await gravarCarrinho(page, ['clean-zoom-g6', 'rock-boss-gt-1000', 'metal-nux-mg-30']);
    let pedidos = 0;
    page.on('request', (req) => { if (req.url() === `${API}/packs`) pedidos += 1; });
    await page.goto('carrinho.html');
    await expect(itens(page)).toHaveCount(3);
    await expect(contador(page)).toHaveText('Carrinho (3)');
    await page.evaluate(() => { window.semRecarregar = true; });

    await itens(page).nth(0).getByRole('button', { name: 'Remover' }).click();

    await expect(itens(page)).toHaveCount(2);
    const nomes = (await page.locator('.itens-carrinho li a').allTextContents()).map((n) => n.trim());
    expect(nomes).toEqual([porId['rock-boss-gt-1000'].nome, porId['metal-nux-mg-30'].nome]);
    await expect(page.locator('#contagem-carrinho')).toHaveText('2 packs no carrinho');
    const soma = porId['rock-boss-gt-1000'].precoCentavos + porId['metal-nux-mg-30'].precoCentavos;
    await expect(page.locator('.total-carrinho')).toHaveText(`Total: ${formatoBRL(soma)}`);
    await expect(contador(page)).toHaveText('Carrinho (2)');
    expect(await lerCarrinho(page)).toBe('["rock-boss-gt-1000","metal-nux-mg-30"]');
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    expect(pedidos).toBe(1);

    // PAGC-02 singular.
    await itens(page).nth(0).getByRole('button', { name: 'Remover' }).click();
    await expect(page.locator('#contagem-carrinho')).toHaveText('1 pack no carrinho');
  });

  // PAGC-05
  test('remover o último pack mostra o carrinho vazio', async ({ page }) => {
    await gravarCarrinho(page, ['clean-zoom-g6']);
    await page.goto('carrinho.html');
    await expect(itens(page)).toHaveCount(1);
    await itens(page).nth(0).getByRole('button', { name: 'Remover' }).click();

    await expect(page.getByText(VAZIO, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver os packs' })).toHaveAttribute('href', 'packs.html');
    await expect(page.locator('.total-carrinho')).toBeHidden();
    await expect(itens(page)).toHaveCount(0);
    await expect(contador(page)).toHaveText('Carrinho (0)');
  });

  // PAGC-04
  test('com o carrinho vazio, mostra o estado vazio sem pedir nada à API', async ({ page }) => {
    const pedidos = [];
    page.on('request', (req) => { if (req.url().startsWith(API)) pedidos.push(req.url()); });
    await page.goto('carrinho.html');
    await expect(page.getByText(VAZIO, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver os packs' })).toHaveAttribute('href', 'packs.html');
    await expect(page.locator('.total-carrinho')).toBeHidden();
    // Give a late request time to show up before asserting there was none.
    await page.waitForLoadState('networkidle');
    expect(pedidos).toEqual([]);
  });

  // PAGC-07
  test('um pack que não existe mais é tirado do carrinho, da lista e do total, com aviso', async ({ page }) => {
    const porId = await packsPorId(page);
    await gravarCarrinho(page, ['jazz-boss-x', 'clean-zoom-g6']);
    await page.goto('carrinho.html');

    await expect(page.getByText(AVISO_REMOVIDO, { exact: true })).toBeVisible();
    await expect(itens(page)).toHaveCount(1);
    await expect(page.locator('.total-carrinho')).toHaveText(`Total: ${formatoBRL(porId['clean-zoom-g6'].precoCentavos)}`);
    expect(await lerCarrinho(page)).toBe('["clean-zoom-g6"]');
    await expect(contador(page)).toHaveText('Carrinho (1)');
  });

  // PAGC-06
  test('enquanto carrega, mostra "Carregando carrinho..." e nenhum item', async ({ page }) => {
    await gravarCarrinho(page, ['clean-zoom-g6']);
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs`, async (rota) => { await liberado; await rota.continue(); });
    await page.goto('carrinho.html');

    await expect(page.getByRole('status').filter({ hasText: CARREGANDO })).toHaveText(CARREGANDO);
    await expect(itens(page)).toHaveCount(0);
    await expect(page.locator('.total-carrinho')).toBeHidden();

    liberar();
    await expect(itens(page)).toHaveCount(1);
    await expect(page.getByRole('status').filter({ hasText: CARREGANDO })).toHaveCount(0);
  });

  // PAGC-08
  test('falha de comunicação mostra o erro, mantém o carrinho e "Tentar novamente" carrega a lista', async ({ page }) => {
    // The route is armed after gravarCarrinho: index.html also requests /packs.
    await gravarCarrinho(page, ['clean-zoom-g6', 'rock-boss-gt-1000']);
    let tentativas = 0;
    await page.route(`${API}/packs`, (rota) => {
      tentativas += 1;
      return tentativas === 1 ? rota.abort() : rota.continue();
    });
    await page.goto('carrinho.html');

    const alerta = page.getByRole('alert');
    await expect(alerta.locator('p')).toHaveText(ERRO);
    await expect(itens(page)).toHaveCount(0);
    expect(await lerCarrinho(page)).toBe('["clean-zoom-g6","rock-boss-gt-1000"]');

    await alerta.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(itens(page)).toHaveCount(2);
    expect(tentativas).toBe(2);
  });

  // HDR-01 on carrinho.html, with "Entrar" and with the session.
  test('carrinho.html mostra o link do carrinho com "Entrar" e, com sessão, com "Olá"', async ({ page }) => {
    await gravarCarrinho(page, ['clean-zoom-g6']);
    await page.goto('carrinho.html');
    await expect(contador(page)).toHaveText('Carrinho (1)');
    await expect(page.locator('.acoes-cabecalho a.entrar')).toBeVisible();

    await page.evaluate(() => sessionStorage.setItem('corsino:sessao', '{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}'));
    await page.goto('carrinho.html');
    await expect(page.locator('.acoes-cabecalho').getByText('Olá, Ryan', { exact: true })).toBeVisible();
    await expect(contador(page)).toHaveText('Carrinho (1)');
  });
});
