// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-packs/spec.md: PAG-01..09,
// EDGE-01, EDGE-02 (pack page). Expected values come from the mock API.

const API = 'http://127.0.0.1:3000';
const formatoBRL = (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
const ROTULOS_MARCA = {
  boss: 'Boss', line6: 'Line 6', nux: 'NUX', mooer: 'Mooer', zoom: 'Zoom', headrush: 'HeadRush', valeton: 'Valeton', hotone: 'Hotone',
};
const NAO_ENCONTRADO = 'Pack não encontrado.';
const CARREGANDO = 'Carregando pack...';
const MENSAGEM_ERRO = 'Não foi possível carregar o pack. Verifique sua conexão e tente novamente.';

const blocoDoPack = (page) => page.locator('.preset-topo');

/** Asserts the not-found state: message, link to the packs page, no pack block. */
async function esperarNaoEncontrado(page) {
  await expect(page.getByText(NAO_ENCONTRADO, { exact: true })).toBeVisible();
  const link = page.getByRole('link', { name: 'Ver todos os packs' });
  await expect(link).toHaveAttribute('href', 'packs.html');
  await expect(blocoDoPack(page)).toBeHidden();
  await expect(page.locator('.pack-presets li')).toHaveCount(0);
}

test.describe('etapa05-packs T5 - pack page', () => {
  // PAG-01, PAG-02
  test('pack.html?id=metal mostra o pack e a lista dos presets incluídos', async ({ page }) => {
    const pedidoPack = page.waitForRequest(`${API}/packs/metal`);
    const pedidoPresets = page.waitForRequest(`${API}/presets?estilo=metal`);
    await page.goto('pack.html?id=metal');
    await Promise.all([pedidoPack, pedidoPresets]);

    const pack = await page.request.get(`${API}/packs/metal`).then((r) => r.json());
    const presets = await page.request.get(`${API}/presets?estilo=metal`).then((r) => r.json());

    await expect(page.locator('h1')).toHaveText(pack.nome);
    await expect(page.locator('.preset-info')).toContainText(pack.descricao);
    await expect(page.locator('.pack-preco')).toHaveText(formatoBRL(pack.precoCentavos));
    await expect(page.locator('.pack-quantidade')).toHaveText(`${presets.length} presets`);

    const itens = page.locator('.pack-presets li');
    await expect(itens).toHaveCount(presets.length);
    for (const preset of presets) {
      const item = itens.filter({ hasText: preset.nome });
      await expect(item).toHaveCount(1);
      await expect(item).toContainText(`${ROTULOS_MARCA[preset.marca]} · ${preset.equipamento}`);
      await expect(item).toContainText(preset.descricao);
    }
    // PAG-02: a list, not cards.
    await expect(page.locator('.cartao')).toHaveCount(0);
  });

  // PAG-03
  test('o título da aba é "{nome} | CorsinoTones"', async ({ page }) => {
    await page.goto('pack.html?id=metal');
    await expect(page).toHaveTitle('Pack Metal | CorsinoTones');
  });

  // PAG-04
  test('a página do pack não tem link de download', async ({ page }) => {
    await page.goto('pack.html?id=rock');
    await expect(page.locator('h1')).toHaveText('Pack Rock');
    await expect(page.locator('a[download]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /download/i })).toHaveCount(0);
  });

  // PAG-05, EDGE-01: a malformed id is not found without any request.
  for (const busca of ['', '?id=', '?id=Rock', '?id=rock1', '?id=..%2Fx', '?x=rock']) {
    test(`pack.html${busca} mostra "Pack não encontrado." sem pedir nada à API`, async ({ page }) => {
      const pedidos = [];
      page.on('request', (req) => { if (req.url().startsWith(API)) pedidos.push(req.url()); });
      await page.goto(`pack.html${busca}`);
      await esperarNaoEncontrado(page);
      expect(pedidos).toEqual([]);
    });
  }

  // PAG-06
  test('um pack que não existe (404) mostra "Pack não encontrado."', async ({ page }) => {
    const resposta = page.waitForResponse(`${API}/packs/jazz`);
    await page.goto('pack.html?id=jazz');
    expect((await resposta).status()).toBe(404);
    await esperarNaoEncontrado(page);
  });

  // PAG-07, PAG-09
  test('falha de rede mostra o erro e "Tentar novamente" carrega o pack', async ({ page }) => {
    let tentativas = 0;
    await page.route(`${API}/packs/rock`, (rota) => {
      tentativas += 1;
      return tentativas === 1 ? rota.abort() : rota.continue();
    });
    await page.goto('pack.html?id=rock');

    const alerta = page.getByRole('alert');
    await expect(alerta.locator('p')).toHaveText(MENSAGEM_ERRO);
    await expect(blocoDoPack(page)).toBeHidden();

    await alerta.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.locator('h1')).toHaveText('Pack Rock');
    await expect(blocoDoPack(page)).toBeVisible();
    expect(tentativas).toBe(2);
  });

  // EDGE-02 on the pack page: the pack answers but its presets fail.
  test('se só a lista de presets falha, aparece o erro e não o pack', async ({ page }) => {
    await page.route(`${API}/presets?**`, (rota) => rota.abort());
    await page.goto('pack.html?id=rock');
    await expect(page.getByRole('alert').locator('p')).toHaveText(MENSAGEM_ERRO);
    await expect(blocoDoPack(page)).toBeHidden();
  });

  // PAG-08
  test('enquanto carrega, mostra "Carregando pack..." e esconde o bloco do pack', async ({ page }) => {
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs/rock`, async (rota) => { await liberado; await rota.continue(); });
    await page.goto('pack.html?id=rock');

    await expect(page.getByRole('status').filter({ hasText: CARREGANDO })).toHaveText(CARREGANDO);
    await expect(blocoDoPack(page)).toBeHidden();

    liberar();
    await expect(page.locator('h1')).toHaveText('Pack Rock');
    await expect(page.getByRole('status').filter({ hasText: CARREGANDO })).toHaveCount(0);
  });

  // EDGE-03 of the spec (header): signed in, the pack page shows the user.
  test('com sessão, a página do pack mostra "Olá, Ryan" no cabeçalho', async ({ page }) => {
    await page.goto('index.html');
    await page.evaluate(() => sessionStorage.setItem('corsino:sessao', '{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}'));
    await page.goto('pack.html?id=rock');
    await expect(page.getByText('Olá, Ryan', { exact: true })).toBeVisible();
  });
});
