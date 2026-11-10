// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-biblioteca/spec.md: LIB-01..09
// (T2), DL-01..04 (T3) and REG-01. Lesson L-014: users, packs and dates differ
// per item, and no order has id 1 by accident.

const API = 'http://127.0.0.1:3000';
const PEDIDOS = /127\.0\.0\.1:3000\/pedidos/;
let proximo = 9100000 + (Date.now() % 100000) * 10;
const novoUsuario = () => (proximo += 1);
const sessaoDe = (id) => JSON.stringify({ id, nome: `Usuário ${id}`, email: `u${id}@exemplo.com` });
const pedidoDe = (usuarioId, packIds, criadoEm, status = 'pago') => ({ usuarioId, packIds, totalCentavos: 0, status, criadoEm });

const ROCK = 'rock-boss-gt-1000';
const BLUES = 'blues-line6-hx-stomp';
const METAL = 'metal-nux-mg-30';
const CLEAN = 'clean-zoom-g6';

/** Opens biblioteca.html signed in as `id`. */
async function abrir(page, id) {
  await page.goto('login.html');
  await page.evaluate((s) => sessionStorage.setItem('corsino:sessao', s), sessaoDe(id));
  await page.goto('biblioteca.html');
}

const criar = (request, dados) => request.post(`${API}/pedidos`, { data: dados });
const blocos = (page) => page.locator('.biblioteca-pack');
const textoDe = (n) => (n === 1 ? '1 preset' : `${n} presets`);

async function catalogo(page) {
  const packs = await page.request.get(`${API}/packs`).then((r) => r.json());
  const presets = await page.request.get(`${API}/presets`).then((r) => r.json());
  return {
    pack: (id) => packs.find((p) => p.id === id),
    presets: (id) => presets.filter((p) => p.packId === id),
  };
}

test.describe('etapa05-biblioteca T2 - signed out (REG-01)', () => {
  test('sem sessão: pop-up de login, nenhuma requisição da biblioteca, e a página não sai sozinha', async ({ page }) => {
    await page.goto('login.html');
    await page.evaluate(() => sessionStorage.clear());
    await page.clock.install();
    const pedidos = [];
    page.on('request', (req) => { if (req.url().startsWith(API)) pedidos.push(req.url()); });
    await page.goto('biblioteca.html');

    await expect(page.getByRole('dialog')).toContainText('Faça login para acessar sua biblioteca');
    await expect(page.locator('.biblioteca-pack')).toHaveCount(0);
    await expect(page.getByText('Sua biblioteca ainda está vazia.')).toBeHidden();
    const url = page.url();
    await page.clock.fastForward(60000);
    expect(page.url()).toBe(url);
    await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
    expect(pedidos).toEqual([]);
  });
});

test.describe('etapa05-biblioteca T2 - the library of bought packs', () => {
  // LIB-01, LIB-02, LIB-03, LIB-05
  test('lista só os packs pagos do usuário, do pedido mais novo ao mais antigo, com seus presets', async ({ page, request }) => {
    const eu = novoUsuario();
    const outro = novoUsuario();
    await criar(request, pedidoDe(eu, [ROCK], '2026-11-01T10:00:00.000Z'));
    await criar(request, pedidoDe(eu, [BLUES], '2026-11-03T10:00:00.000Z'));
    await criar(request, pedidoDe(eu, [METAL], '2026-11-04T10:00:00.000Z', 'pendente'));
    await criar(request, pedidoDe(outro, [CLEAN], '2026-11-05T10:00:00.000Z'));
    const cat = await catalogo(page);
    const pedido = page.waitForRequest((r) => r.url() === `${API}/pedidos?usuarioId=${eu}&status=pago`);

    await abrir(page, eu);
    await pedido;

    await expect(blocos(page)).toHaveCount(2);
    await expect(blocos(page).first()).toBeVisible();
    for (const [i, id] of [BLUES, ROCK].entries()) {
      const bloco = blocos(page).nth(i);
      const presets = cat.presets(id);
      await expect(bloco.locator('h2')).toHaveText(cat.pack(id).nome);
      await expect(bloco.locator('.pack-quantidade')).toHaveText(textoDe(presets.length));
      const linhas = bloco.locator('.pack-presets li');
      await expect(linhas).toHaveCount(presets.length);
      for (const [j, preset] of presets.entries()) {
        await expect(linhas.nth(j).locator('h3')).toHaveText(preset.nome);
        await expect(linhas.nth(j).locator('.pack-preset-equipamento')).toHaveText(new RegExp(`· ${preset.equipamento}$`));
        await expect(linhas.nth(j)).toContainText(preset.descricao);
      }
    }
    expect(cat.presets(BLUES).length).not.toBe(cat.presets(ROCK).length);
    await expect(page.locator('main')).not.toContainText(cat.pack(METAL).nome);
    await expect(page.locator('main')).not.toContainText(cat.pack(CLEAN).nome);
    await expect(page.getByText('Sua biblioteca ainda está vazia.')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Explorar packs' })).toBeHidden();
  });

  // LIB-03 (singular)
  test('um pack com um único preset mostra "1 preset" e uma linha', async ({ page, request }) => {
    const eu = novoUsuario();
    await criar(request, pedidoDe(eu, [ROCK], '2026-11-01T10:00:00.000Z'));
    const cat = await catalogo(page);
    const unico = cat.presets(ROCK)[1];
    await page.route(`${API}/presets`, async (route) => {
      const resposta = await route.fetch();
      const todos = await resposta.json();
      await route.fulfill({ response: resposta, json: todos.filter((p) => p.packId !== ROCK || p.id === unico.id) });
    });
    await abrir(page, eu);

    await expect(blocos(page).locator('.pack-quantidade')).toHaveText('1 preset');
    await expect(blocos(page).locator('.pack-presets li')).toHaveCount(1);
    await expect(blocos(page).locator('.pack-presets h3')).toHaveText(unico.nome);
  });

  // LIB-04
  test('um pack em dois pedidos pagos aparece uma vez', async ({ page, request }) => {
    const eu = novoUsuario();
    await criar(request, pedidoDe(eu, [ROCK], '2026-11-01T10:00:00.000Z'));
    await criar(request, pedidoDe(eu, [ROCK, BLUES], '2026-11-02T10:00:00.000Z'));
    const cat = await catalogo(page);
    await abrir(page, eu);

    await expect(blocos(page)).toHaveCount(2);
    await expect(blocos(page).nth(0).locator('h2')).toHaveText(cat.pack(ROCK).nome);
    await expect(blocos(page).nth(1).locator('h2')).toHaveText(cat.pack(BLUES).nome);
  });

  // LIB-07
  test('um packId que o catálogo não conhece não aparece nem gera aviso', async ({ page, request }) => {
    const eu = novoUsuario();
    await criar(request, pedidoDe(eu, ['fantasma-xx-1', ROCK], '2026-11-01T10:00:00.000Z'));
    await abrir(page, eu);

    await expect(blocos(page)).toHaveCount(1);
    await expect(page.locator('main')).not.toContainText('fantasma');
    await expect(page.locator('main [role="alert"], main [role="status"]')).toHaveCount(0);
  });

  // LIB-06
  test('sem pedido pago: texto de biblioteca vazia e "Explorar packs"', async ({ page, request }) => {
    const eu = novoUsuario();
    await criar(request, pedidoDe(eu, [ROCK], '2026-11-01T10:00:00.000Z', 'pendente'));
    await abrir(page, eu);

    await expect(page.getByText('Sua biblioteca ainda está vazia.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explorar packs' })).toHaveAttribute('href', 'packs.html');
    await expect(blocos(page)).toHaveCount(0);
  });

  // LIB-08
  test('enquanto carrega mostra "Carregando biblioteca..." e nenhum bloco', async ({ page, request }) => {
    const eu = novoUsuario();
    await criar(request, pedidoDe(eu, [ROCK], '2026-11-01T10:00:00.000Z'));
    let liberar = () => {};
    const segurado = new Promise((resolve) => { liberar = resolve; });
    await page.route(PEDIDOS, async (route) => { await segurado; await route.continue(); });
    await abrir(page, eu);

    await expect(page.getByText('Carregando biblioteca...')).toBeVisible();
    await expect(blocos(page)).toHaveCount(0);
    await expect(page.getByText('Sua biblioteca ainda está vazia.')).toBeHidden();
    liberar();
    await expect(blocos(page)).toHaveCount(1);
    await expect(page.getByText('Carregando biblioteca...')).toHaveCount(0);
  });

  // LIB-09
  test('falha de comunicação mostra o erro com "Tentar novamente" e, ao tentar, a biblioteca', async ({ page, request }) => {
    const eu = novoUsuario();
    await criar(request, pedidoDe(eu, [ROCK], '2026-11-01T10:00:00.000Z'));
    await page.route(PEDIDOS, (route) => route.abort());
    await abrir(page, eu);

    await expect(page.getByText('Não foi possível carregar a biblioteca. Verifique sua conexão e tente novamente.')).toBeVisible();
    await expect(blocos(page)).toHaveCount(0);
    await page.unroute(PEDIDOS);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect(blocos(page)).toHaveCount(1);
    await expect(page.getByText('Não foi possível carregar a biblioteca.')).toHaveCount(0);
  });
});
