// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-auth/spec.md: SES-02..05 (T7) and
// PROT-01, PROT-05 (T8).

const CHAVE = 'corsino:sessao';
const SESSAO_RYAN = { id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com' };
const PAGINAS_COM_CABECALHO = ['index.html', 'packs.html', 'pack.html?id=rock-boss-gt-1000'];

/** Opens a session in this tab, as a successful login would. */
async function abrirSessao(page, sessao = SESSAO_RYAN) {
  await page.goto('index.html');
  await page.evaluate(([chave, valor]) => sessionStorage.setItem(chave, valor), [CHAVE, JSON.stringify(sessao)]);
}

const linkEntrar = (page) => page.locator('a.entrar[href="login.html"]');
const botaoSair = (page) => page.locator('.cabecalho, .navegacao').getByRole('button', { name: 'Sair' });

test.describe('etapa05-auth T7 - header shows the signed-in user', () => {
  for (const pagina of PAGINAS_COM_CABECALHO) {
    // SES-02
    test(`${pagina} com sessão mostra "Olá, Ryan" e "Sair", sem o link "Entrar"`, async ({ page }) => {
      await abrirSessao(page);
      await page.goto(pagina);

      await expect(page.getByText('Olá, Ryan', { exact: true })).toBeVisible();
      await expect(botaoSair(page)).toBeVisible();
      await expect(linkEntrar(page)).toHaveCount(0);
    });

    // SES-03
    test(`${pagina} sem sessão mostra o link "Entrar"`, async ({ page }) => {
      await page.goto(pagina);

      await expect(linkEntrar(page)).toBeVisible();
      await expect(linkEntrar(page)).toContainText('Entrar');
      await expect(botaoSair(page)).toHaveCount(0);
    });
  }

  // SES-04
  test('"Sair" encerra a sessão e leva à página inicial com "Entrar"', async ({ page }) => {
    await abrirSessao(page);
    await page.goto('packs.html');

    await botaoSair(page).click();

    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    expect(await page.evaluate((chave) => sessionStorage.getItem(chave), CHAVE)).toBeNull();
    await expect(linkEntrar(page)).toBeVisible();
  });

  // SES-05
  test('o nome entra no cabeçalho como texto, nunca como HTML', async ({ page }) => {
    await abrirSessao(page, { id: 2, nome: '<img src=x onerror=alert(1)>', email: 'x@y.com' });
    const dialogos = [];
    page.on('dialog', (dialogo) => { dialogos.push(dialogo.message()); dialogo.dismiss(); });

    await page.goto('index.html');

    await expect(page.getByText('Olá, <img', { exact: true })).toBeVisible();
    await expect(page.locator('.cabecalho img[src="x"], .navegacao img[src="x"]')).toHaveCount(0);
    expect(dialogos).toEqual([]);
  });
});

const AVISO = 'Faça login para acessar sua biblioteca';
const dialogoLogin = (page) => page.getByRole('dialog');

test.describe('etapa05-auth T8/T9 - library requires a session', () => {
  // PROT-01 (revised in T9): a pop-up explains, and the page does not move by itself.
  test('sem sessão, biblioteca.html abre um pop-up modal pedindo login e não sai da página', async ({ page }) => {
    // Fake clock: a delayed redirect (setTimeout) would fire inside runFor below
    // instead of after the test ends (Verifier gap, P07).
    await page.clock.install();
    const navegacoes = [];
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navegacoes.push(frame.url()); });
    await page.goto('biblioteca.html');

    const dialogo = dialogoLogin(page);
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText(AVISO);
    await expect(dialogo.getByRole('button', { name: 'Fazer login' })).toBeVisible();
    await expect(dialogo.getByRole('button', { name: 'Voltar' })).toBeVisible();
    expect(await dialogo.evaluate((el) => el.matches(':modal'))).toBe(true);

    // "SHALL NOT change the location by itself": a minute later, still here, still asking.
    await page.clock.runFor(60_000);
    await expect(page).toHaveURL(/\/frontend\/biblioteca\.html$/);
    await expect(dialogo).toBeVisible();
    expect(navegacoes.map((url) => new URL(url).pathname)).toEqual(['/frontend/biblioteca.html']);
    // The fake clock drives JS timers only; a <meta http-equiv="refresh"> runs on
    // the real clock and would fire after the test ends (Verifier gap, P07e).
    // A single read, not toHaveCount(): its retries would wait until the refresh
    // had moved to login.html, which has no such meta, and then pass.
    expect(await page.locator('meta[http-equiv="refresh" i]').count()).toBe(0);
  });

  // PROT-06
  test('"Fazer login" leva a login.html?voltar=biblioteca.html', async ({ page }) => {
    await page.goto('biblioteca.html');
    await dialogoLogin(page).getByRole('button', { name: 'Fazer login' }).click();
    await expect(page).toHaveURL(/\/frontend\/login\.html\?voltar=biblioteca\.html$/);
  });

  // PROT-07
  test('"Voltar" leva à página inicial', async ({ page }) => {
    await page.goto('biblioteca.html');
    await dialogoLogin(page).getByRole('button', { name: 'Voltar' }).click();
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
  });

  // PROT-07
  test('Esc no pop-up também leva à página inicial', async ({ page }) => {
    await page.goto('biblioteca.html');
    await expect(dialogoLogin(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
  });

  // PROT-05, SES-02
  test('com sessão, biblioteca.html continua aberta, sem pop-up, e mostra "Olá, Ryan"', async ({ page }) => {
    await abrirSessao(page);
    await page.goto('biblioteca.html');

    await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible();
    await expect(page.getByText('Olá, Ryan', { exact: true })).toBeVisible();
    await expect(page.locator('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/frontend\/biblioteca\.html$/);
  });

  // PROT-01, PROT-06, PROT-02: the whole return path.
  test('sem sessão → pop-up → "Fazer login" → login com a conta de teste → volta à biblioteca', async ({ page }) => {
    await page.goto('biblioteca.html');
    await dialogoLogin(page).getByRole('button', { name: 'Fazer login' }).click();

    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    await page.locator('#form-login button[type="submit"]').click();

    await expect(page).toHaveURL(/\/frontend\/biblioteca\.html$/);
    await expect(page.getByText('Olá, Ryan', { exact: true })).toBeVisible();
    await expect(page.locator('dialog')).toHaveCount(0);
  });
});

const CHAVE_CARRINHO = 'corsino:carrinho';
const linkCarrinho = (page) => page.locator('.acoes-cabecalho a.carrinho[href="carrinho.html"]');

/** Stores cart ids in this tab's origin, as the cart service would. */
async function gravarCarrinho(page, ids) {
  await page.goto('index.html');
  await page.evaluate(([chave, valor]) => localStorage.setItem(chave, valor), [CHAVE_CARRINHO, JSON.stringify(ids)]);
}

test.describe('etapa05-carrinho T2 - cart link in the header', () => {
  for (const pagina of ['index.html', 'packs.html', 'pack.html?id=rock-boss-gt-1000', 'biblioteca.html', 'login.html']) {
    // HDR-01
    test(`${pagina} mostra "Carrinho (0)" com o carrinho vazio e "Carrinho (2)" com dois packs`, async ({ page }) => {
      await page.goto(pagina);
      await expect(linkCarrinho(page)).toHaveText('Carrinho (0)');
      await expect(linkCarrinho(page).locator('svg')).toHaveCount(1);

      await gravarCarrinho(page, ['rock-boss-gt-1000', 'clean-zoom-g6']);
      await page.goto(pagina);
      await expect(linkCarrinho(page)).toHaveText('Carrinho (2)');
    });
  }

  // HDR-03: next to "Entrar" signed out, next to "Olá"/"Sair" signed in.
  test('o link do carrinho fica junto de "Entrar" e, com sessão, junto de "Olá" e "Sair"', async ({ page }) => {
    await page.goto('packs.html');
    await expect(page.locator('.acoes-cabecalho a.entrar')).toBeVisible();
    await expect(linkCarrinho(page)).toBeVisible();

    await abrirSessao(page);
    await page.goto('packs.html');
    await expect(page.locator('.acoes-cabecalho').getByText('Olá, Ryan', { exact: true })).toBeVisible();
    await expect(page.locator('.acoes-cabecalho').getByRole('button', { name: 'Sair' })).toBeVisible();
    await expect(linkCarrinho(page)).toBeVisible();
  });

  // HDR-04
  test('"Sair" esvazia o carrinho', async ({ page }) => {
    await gravarCarrinho(page, ['rock-boss-gt-1000']);
    await abrirSessao(page);
    await page.goto('packs.html');
    await expect(linkCarrinho(page)).toHaveText('Carrinho (1)');

    await botaoSair(page).click();

    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_CARRINHO)).toBeNull();
    await expect(linkCarrinho(page)).toHaveText('Carrinho (0)');
  });

  // HDR-05
  test('o carrinho montado sem login continua depois de entrar', async ({ page }) => {
    await gravarCarrinho(page, ['metal-nux-mg-30']);
    await page.goto('login.html');
    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    await page.locator('#form-login button[type="submit"]').click();

    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    await expect(linkCarrinho(page)).toHaveText('Carrinho (1)');
    expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_CARRINHO)).toBe('["metal-nux-mg-30"]');
  });
});
