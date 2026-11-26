// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-biblioteca/spec.md: LIB-01..09
// (T2), DL-01..04 (T3) and REG-01. Lesson L-014: users, packs and dates differ
// per item, and no order has id 1 by accident.

// Since etapa06-front-spring-loja (MIG-06, MIG-08, MIG-11, EDG-03) the orders are real Spring
// orders of users made by tests/apoio/api.js, created oldest first (the server sets criadoEm).
// Spring creates every order paid and rejects unknown pack ids, so the old "pending order" and
// "unknown pack in an order" setups are built by intercepting GET /pedidos instead.
const { SPRING, comprar, registrarUsuario } = require('./apoio/api');
const API = SPRING;
const PEDIDOS = /127\.0\.0\.1:8081\/pedidos/;

const ROCK = 'rock-boss-gt-1000';
const BLUES = 'blues-line6-hx-stomp';
const CLEAN = 'clean-zoom-g6';

/** Opens biblioteca.html signed in as `conta` (from registrarUsuario). */
async function abrir(page, conta) {
  await page.goto('login.html');
  await page.evaluate((s) => sessionStorage.setItem('corsino:sessao', s), conta.sessao);
  await page.goto('biblioteca.html');
}

/** A paid order of `conta` with these packs; call oldest first. */
const criar = (request, conta, packIds) => comprar(request, conta.token, packIds);
const blocos = (page) => page.locator('.biblioteca-pack');
const textoDe = (n) => (n === 1 ? '1 preset' : `${n} presets`);

async function catalogo(page) {
  const packs = await page.request.get(`${SPRING}/packs`).then((r) => r.json());
  const presets = await page.request.get(`${SPRING}/presets`).then((r) => r.json());
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
    const eu = await registrarUsuario(request);
    const outro = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
    await criar(request, eu, [BLUES]);
    await criar(request, outro, [CLEAN]);
    const cat = await catalogo(page);
    const pedido = page.waitForRequest((r) => r.url() === `${API}/pedidos?status=pago`);

    await abrir(page, eu);
    expect((await pedido).headers().authorization).toBe(`Bearer ${eu.token}`);

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
    await expect(page.locator('main')).not.toContainText(cat.pack(CLEAN).nome);
    await expect(page.getByText('Sua biblioteca ainda está vazia.')).toBeHidden();
    await expect(page.getByRole('link', { name: 'Explorar packs' })).toBeHidden();
  });

  // LIB-03 (singular)
  test('um pack com um único preset mostra "1 preset" e uma linha', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
    const cat = await catalogo(page);
    const unico = cat.presets(ROCK)[1];
    await page.route(`${SPRING}/presets`, async (route) => {
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
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
    await criar(request, eu, [ROCK, BLUES]);
    const cat = await catalogo(page);
    await abrir(page, eu);

    await expect(blocos(page)).toHaveCount(2);
    await expect(blocos(page).nth(0).locator('h2')).toHaveText(cat.pack(ROCK).nome);
    await expect(blocos(page).nth(1).locator('h2')).toHaveText(cat.pack(BLUES).nome);
  });

  // LIB-07
  test('um packId que o catálogo não conhece não aparece nem gera aviso', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
    // Spring rejects an unknown pack id on creation, so the stale id is added to the answer.
    await page.route(PEDIDOS, async (route) => {
      const resposta = await route.fetch();
      const pedidos = await resposta.json();
      await route.fulfill({ response: resposta, json: pedidos.map((p) => ({ ...p, packIds: ['fantasma-xx-1', ...p.packIds] })) });
    });
    await abrir(page, eu);

    await expect(blocos(page)).toHaveCount(1);
    await expect(page.locator('main')).not.toContainText('fantasma');
    await expect(page.locator('main [role="alert"], main [role="status"]')).toHaveCount(0);
  });

  // LIB-06
  test('sem pedido pago: texto de biblioteca vazia e "Explorar packs"', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await abrir(page, eu);

    await expect(page.getByText('Sua biblioteca ainda está vazia.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explorar packs' })).toHaveAttribute('href', 'packs.html');
    await expect(blocos(page)).toHaveCount(0);
  });

  // LIB-08
  test('enquanto carrega mostra "Carregando biblioteca..." e nenhum bloco', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
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
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
    await page.route(PEDIDOS, (route) => route.abort());
    await abrir(page, eu);

    await expect(page.getByText('Não foi possível carregar a biblioteca. Verifique sua conexão e tente novamente.')).toBeVisible();
    await expect(blocos(page)).toHaveCount(0);
    await page.unroute(PEDIDOS);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect(blocos(page)).toHaveCount(1);
    await expect(page.getByText('Não foi possível carregar a biblioteca.')).toHaveCount(0);
  });

  // MIG-08: a rejected token is not a connection problem; it asks for a new login.
  test('um 401 nos pedidos encerra a sessão e leva ao login com voltar=biblioteca.html', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await page.route(PEDIDOS, (route) => route.fulfill({
      status: 401, json: { status: 401, mensagem: 'Faça login para continuar.', campos: {} },
    }));
    await abrir(page, eu);

    await expect(page).toHaveURL(/\/frontend\/login\.html\?voltar=biblioteca\.html$/);
    expect(await page.evaluate(() => sessionStorage.getItem('corsino:sessao'))).toBeNull();
  });
});

test.describe('etapa05-biblioteca T3 - download of each preset', () => {
  // DL-01
  test('cada linha de preset tem um botão "Download"', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK, BLUES]);
    const cat = await catalogo(page);
    await abrir(page, eu);

    const total = cat.presets(ROCK).length + cat.presets(BLUES).length;
    await expect(page.locator('.pack-presets li')).toHaveCount(total);
    await expect(page.getByRole('button', { name: 'Download' })).toHaveCount(total);
    for (const linha of await page.locator('.pack-presets li').all()) {
      await expect(linha.getByRole('button', { name: 'Download' })).toHaveCount(1);
    }
  });

  // DL-02, DL-03
  test('"Download" do segundo preset salva preset-{id}.json com os dados desse preset', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
    const cat = await catalogo(page);
    const alvo = cat.presets(ROCK)[1];
    await abrir(page, eu);

    const evento = page.waitForEvent('download');
    await page.locator('.pack-presets li').nth(1).getByRole('button', { name: 'Download' }).click();
    const download = await evento;

    expect(download.suggestedFilename()).toBe(`preset-${alvo.id}.json`);
    const conteudo = JSON.parse(require('fs').readFileSync(await download.path(), 'utf8'));
    expect(conteudo).toEqual({
      id: alvo.id,
      nome: alvo.nome,
      estilo: alvo.estilo,
      marca: alvo.marca,
      equipamento: alvo.equipamento,
      descricao: alvo.descricao,
      packId: alvo.packId,
    });
    expect(alvo.id).not.toBe(cat.presets(ROCK)[0].id);
  });

  // DL-04
  test('pack.html, packs.html e index.html não têm "Download"', async ({ page, request }) => {
    const eu = await registrarUsuario(request);
    await criar(request, eu, [ROCK]);
    await page.goto('login.html');
    await page.evaluate((s) => sessionStorage.setItem('corsino:sessao', s), eu.sessao);
    const paginas = [
      ['pack.html?id=' + ROCK, '.pack-presets li'],
      ['packs.html', '.grade-presets .cartao'],
      ['index.html', '.carrossel .cartao'],
    ];
    for (const [url, carregado] of paginas) {
      await page.goto(url);
      await expect(page.locator(carregado).first(), url).toBeVisible();
      await expect(page.getByText(/download/i), url).toHaveCount(0);
      await expect(page.getByRole('button', { name: /download/i }), url).toHaveCount(0);
      await expect(page.getByRole('link', { name: /download/i }), url).toHaveCount(0);
    }
  });
});
