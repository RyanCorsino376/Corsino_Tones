// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa06-front-spring-auth/spec.md: WEB-06, WEB-15,
// WEB-16 and WEB-19. Nothing here is intercepted except in the last test: the page talks
// to the real Spring server started by playwright.config.js. Spring keeps users in
// memory and every test shares them, so each registration uses a unique e-mail.

const CHAVE = 'corsino:sessao';
const MSG_CREDENCIAIS = 'E-mail ou senha incorretos.';
const MSG_EMAIL_EM_USO = 'Este e-mail já está cadastrado.';

const emailUnico = () => `real-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemplo.com`;

const lerSessao = async (page) => JSON.parse(await page.evaluate((chave) => sessionStorage.getItem(chave), CHAVE));

async function enviarLogin(page, email, senha) {
  await page.locator('#email').fill(email);
  await page.locator('#senha').fill(senha);
  await page.locator('#form-login button[type="submit"]').click();
}

async function enviarCadastro(page, nome, email, senha) {
  await page.locator('[data-alvo="cadastro"]').click();
  await page.locator('#cadastro-nome').fill(nome);
  await page.locator('#cadastro-email').fill(email);
  await page.locator('#cadastro-senha').fill(senha);
  await page.locator('#form-cadastro button[type="submit"]').click();
}

test.describe('etapa06-front-spring-auth T11 - login page against the real Spring server', () => {
  // WEB-15: register, then sign in from a fresh page with the same e-mail in another case.
  test('cadastrar abre a sessão com o id do servidor e um login depois entra com o mesmo id', async ({ page, context }) => {
    const email = emailUnico();
    await page.goto('login.html');
    await enviarCadastro(page, 'Ana Real', email, 'senha-real-1');

    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    const sessao = await lerSessao(page);
    expect(Object.keys(sessao).sort()).toEqual(['email', 'id', 'nome']);
    expect(sessao).toEqual({ id: expect.any(Number), nome: 'Ana Real', email });
    expect(sessao.id).toBeGreaterThan(1);

    const outra = await context.newPage();
    await outra.goto('login.html');
    await enviarLogin(outra, email.toUpperCase(), 'senha-real-1');

    await expect(outra).toHaveURL(/\/frontend\/index\.html$/);
    expect(await lerSessao(outra)).toEqual(sessao);
  });

  // WEB-16: the user seeded from the mock.
  test('ryan@exemplo.com com teste123 abre a sessão com id 1 e o nome do seed', async ({ page }) => {
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');

    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    expect(await lerSessao(page)).toEqual({ id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com' });
  });

  test('uma senha errada mostra a mensagem do servidor e não abre sessão', async ({ page }) => {
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'senha-errada');

    await expect(page.locator('#form-login [role="alert"]')).toHaveText(MSG_CREDENCIAIS);
    expect(await page.evaluate((chave) => sessionStorage.getItem(chave), CHAVE)).toBeNull();
  });

  test('cadastrar o mesmo e-mail duas vezes mostra a mensagem de e-mail em uso no campo', async ({ page, context }) => {
    const email = emailUnico();
    await page.goto('login.html');
    await enviarCadastro(page, 'Ana Real', email, 'senha-real-1');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);

    const outra = await context.newPage();
    await outra.goto('login.html');
    await enviarCadastro(outra, 'Outra Ana', email.toUpperCase(), 'senha-real-2');

    const campo = outra.locator('#cadastro-email');
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    const idMensagem = await campo.getAttribute('aria-describedby');
    await expect(outra.locator(`#${idMensagem}`)).toHaveText(MSG_EMAIL_EM_USO);
    expect(await outra.evaluate((chave) => sessionStorage.getItem(chave), CHAVE)).toBeNull();
  });

  // WEB-06: neither the password nor the token is kept in the browser.
  test('depois do login o navegador não guarda a senha nem o token', async ({ page }) => {
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);

    const guardado = await page.evaluate(() => JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage }));
    expect(guardado).not.toContain('teste123');
    expect(guardado).not.toContain('eyJ');
  });

  test('o mesmo vale depois de um cadastro: senha e token não ficam no navegador', async ({ page }) => {
    await page.goto('login.html');
    await enviarCadastro(page, 'Ana Real', emailUnico(), 'senha-guardada-9');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);

    const guardado = await page.evaluate(() => JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage }));
    expect(guardado).not.toContain('senha-guardada-9');
    expect(guardado).not.toContain('eyJ');
  });

  // WEB-19: Spring being down must not break the pages that still use the mock.
  test('sem resposta do Spring, a página de packs continua listando os packs do mock', async ({ page }) => {
    await page.route('http://127.0.0.1:8081/**', (rota) => rota.abort());
    await page.goto('packs.html');

    await expect(page.locator('.grade-presets .cartao-nome').first()).toBeVisible();
    expect(await page.locator('.grade-presets .cartao-nome').count()).toBeGreaterThan(0);
  });
});
