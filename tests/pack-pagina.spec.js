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
  test('pack.html?id=metal-nux-mg-30 mostra o pack e a lista dos presets incluídos', async ({ page }) => {
    const pedidoPack = page.waitForRequest(`${API}/packs/metal-nux-mg-30`);
    const pedidoPresets = page.waitForRequest(`${API}/presets?packId=metal-nux-mg-30`);
    await page.goto('pack.html?id=metal-nux-mg-30');
    await Promise.all([pedidoPack, pedidoPresets]);

    const pack = await page.request.get(`${API}/packs/metal-nux-mg-30`).then((r) => r.json());
    const presets = await page.request.get(`${API}/presets?packId=metal-nux-mg-30`).then((r) => r.json());
    expect(pack.nome).toBe('Metal · NUX MG-30');
    expect(presets).toHaveLength(3);

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

  // PAG-01 (rev. 2): both reads start without waiting for each other.
  test('a página pede os presets enquanto o pack ainda não respondeu', async ({ page }) => {
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs/clean-zoom-g6`, async (rota) => { await liberado; await rota.continue(); });
    const pedidoPresets = page.waitForRequest(`${API}/presets?packId=clean-zoom-g6`);
    await page.goto('pack.html?id=clean-zoom-g6');
    await pedidoPresets; // arrives while the pack request is held
    liberar();
    await expect(page.locator('h1')).toHaveText('Clean · Zoom G6');
  });

  // PAG-03
  test('o título da aba é "{nome} | CorsinoTones"', async ({ page }) => {
    await page.goto('pack.html?id=metal-nux-mg-30');
    await expect(page).toHaveTitle('Metal · NUX MG-30 | CorsinoTones');
  });

  // PAG-04
  test('a página do pack não tem link de download', async ({ page }) => {
    await page.goto('pack.html?id=rock-boss-gt-1000');
    await expect(page.locator('h1')).toHaveText('Rock · Boss GT-1000');
    await expect(page.locator('a[download]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /download/i })).toHaveCount(0);
  });

  // PAG-05, EDGE-01: a malformed id is not found without any request.
  for (const busca of ['', '?id=', '?id=Rock-boss', '?id=rock_boss', '?id=..%2Fx', '?id=-rock', '?id=rock--boss', '?id=rock-', '?x=rock-boss-gt-1000']) {
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
    await page.route(`${API}/packs/rock-boss-gt-1000`, (rota) => {
      tentativas += 1;
      return tentativas === 1 ? rota.abort() : rota.continue();
    });
    await page.goto('pack.html?id=rock-boss-gt-1000');

    const alerta = page.getByRole('alert');
    await expect(alerta.locator('p')).toHaveText(MENSAGEM_ERRO);
    await expect(blocoDoPack(page)).toBeHidden();

    await alerta.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.locator('h1')).toHaveText('Rock · Boss GT-1000');
    await expect(blocoDoPack(page)).toBeVisible();
    expect(tentativas).toBe(2);
  });

  // EDGE-02 on the pack page: the pack answers but its presets fail.
  test('se só a lista de presets falha, aparece o erro e não o pack', async ({ page }) => {
    await page.route(`${API}/presets?**`, (rota) => rota.abort());
    await page.goto('pack.html?id=rock-boss-gt-1000');
    await expect(page.getByRole('alert').locator('p')).toHaveText(MENSAGEM_ERRO);
    await expect(blocoDoPack(page)).toBeHidden();
  });

  // PAG-08
  test('enquanto carrega, mostra "Carregando pack..." e esconde o bloco do pack', async ({ page }) => {
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs/rock-boss-gt-1000`, async (rota) => { await liberado; await rota.continue(); });
    await page.goto('pack.html?id=rock-boss-gt-1000');

    await expect(page.getByRole('status').filter({ hasText: CARREGANDO })).toHaveText(CARREGANDO);
    await expect(blocoDoPack(page)).toBeHidden();

    liberar();
    await expect(page.locator('h1')).toHaveText('Rock · Boss GT-1000');
    await expect(page.getByRole('status').filter({ hasText: CARREGANDO })).toHaveCount(0);
  });

  // EDGE-03 of the spec (header): signed in, the pack page shows the user.
  test('com sessão, a página do pack mostra "Olá, Ryan" no cabeçalho', async ({ page }) => {
    await page.goto('index.html');
    await page.evaluate(() => sessionStorage.setItem('corsino:sessao', '{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}'));
    await page.goto('pack.html?id=rock-boss-gt-1000');
    await expect(page.getByText('Olá, Ryan', { exact: true })).toBeVisible();
  });
});

// Tests derive from .specs/features/etapa05-biblioteca/spec.md: OWN-01..04, REG-02.
test.describe('etapa05-biblioteca T4 - "Na biblioteca" (R2)', () => {
  const COMPRADO = 'rock-boss-gt-1000';
  const OUTRO = 'metal-nux-mg-30';
  const novoUsuario = () => 10000000 + Math.floor(Math.random() * 900000000);
  const sessaoDe = (id) => JSON.stringify({ id, nome: `Usuário ${id}`, email: `u${id}@exemplo.com` });
  const comprar = (request, usuarioId, packIds, status = 'pago') =>
    request.post(`${API}/pedidos`, { data: { usuarioId, packIds, totalCentavos: 0, status, criadoEm: '2026-11-01T10:00:00.000Z' } });
  const entrarComo = async (page, id) => {
    await page.goto('login.html');
    await page.evaluate((s) => sessionStorage.setItem('corsino:sessao', s), sessaoDe(id));
  };
  const adicionar = (page) => page.getByRole('button', { name: 'Adicionar ao carrinho' });
  const naBiblioteca = (page) => page.getByRole('link', { name: 'Na biblioteca' });

  // OWN-01
  test('quem já comprou o pack vê "Na biblioteca" e não vê "Adicionar ao carrinho"; outro pack segue à venda', async ({ page, request }) => {
    const eu = novoUsuario();
    await comprar(request, eu, [COMPRADO]);
    await entrarComo(page, eu);

    await page.goto(`pack.html?id=${COMPRADO}`);
    await expect(naBiblioteca(page)).toHaveAttribute('href', 'biblioteca.html');
    await expect(adicionar(page)).toHaveCount(0);

    await page.goto(`pack.html?id=${OUTRO}`);
    await expect(adicionar(page)).toBeVisible();
    await expect(naBiblioteca(page)).toHaveCount(0);
  });

  // OWN-02 (and the status guard behind it)
  test('um pack comprado só por outro usuário, ou em pedido não pago, segue com "Adicionar ao carrinho"', async ({ page, request }) => {
    const eu = novoUsuario();
    await comprar(request, novoUsuario(), [OUTRO]);
    await comprar(request, eu, [OUTRO], 'pendente');
    await entrarComo(page, eu);

    await page.goto(`pack.html?id=${OUTRO}`);
    await expect(adicionar(page)).toBeVisible();
    await expect(naBiblioteca(page)).toHaveCount(0);
  });

  // OWN-03
  test('sem sessão: botão de adicionar e nenhuma requisição a /pedidos', async ({ page }) => {
    await page.goto('login.html');
    await page.evaluate(() => sessionStorage.clear());
    const pedidos = [];
    page.on('request', (req) => { if (req.url().startsWith(`${API}/pedidos`)) pedidos.push(req.url()); });

    await page.goto(`pack.html?id=${COMPRADO}`);
    await expect(adicionar(page)).toBeVisible();
    expect(pedidos).toEqual([]);
  });

  // OWN-04
  test('se a leitura dos pedidos falha, a página mostra o pack com "Adicionar ao carrinho"', async ({ page, request }) => {
    const eu = novoUsuario();
    await comprar(request, eu, [COMPRADO]);
    await entrarComo(page, eu);
    await page.route(/127\.0\.0\.1:3000\/pedidos/, (route) => route.abort());

    await page.goto(`pack.html?id=${COMPRADO}`);
    await expect(page.locator('h1')).not.toHaveText('');
    await expect(adicionar(page)).toBeVisible();
    await expect(page.getByText(MENSAGEM_ERRO)).toHaveCount(0);
  });

  // REG-02
  test('um pack no carrinho que não foi comprado ainda mostra "No carrinho"', async ({ page }) => {
    await entrarComo(page, novoUsuario());
    await page.evaluate((id) => localStorage.setItem('corsino:carrinho', JSON.stringify([id])), OUTRO);

    await page.goto(`pack.html?id=${OUTRO}`);
    await expect(page.getByRole('link', { name: 'No carrinho' })).toHaveAttribute('href', 'carrinho.html');
    await expect(adicionar(page)).toHaveCount(0);
    await expect(naBiblioteca(page)).toHaveCount(0);
  });
});
