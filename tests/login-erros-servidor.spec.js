// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa06-front-spring-auth/spec.md: WEB-04 (login)
// and WEB-10 (registration) - a 400 from Spring with `campos` is shown field by field.
// Spring is intercepted, so the server can answer with values the form itself accepts.

const SPRING = 'http://127.0.0.1:8081';
const MSG_CONEXAO = 'Não foi possível conectar ao servidor. Tente novamente.';

const mensagemDe = (page, id) => page.locator(`#${id}`).evaluate((campo) => {
  const alvo = campo.getAttribute('aria-describedby');
  const mensagem = alvo && document.getElementById(alvo);
  return mensagem ? mensagem.textContent.trim() : null;
});

async function responder400(page, corpo) {
  await page.route(`${SPRING}/auth/**`, (rota) => rota.fulfill({ status: 400, json: corpo }));
}

test.describe('etapa06-front-spring-auth T6 - server field errors on the login page', () => {
  test('o cadastro mostra cada mensagem do servidor no seu campo e foca o primeiro', async ({ page }) => {
    await responder400(page, { status: 400, mensagem: 'Dados inválidos.', campos: { nome: 'Nome do servidor', senha: 'Senha do servidor' } });
    await page.goto('login.html');
    await page.locator('[data-alvo="cadastro"]').click();
    await page.locator('#cadastro-nome').fill('Ana Souza');
    await page.locator('#cadastro-email').fill('ana@exemplo.com');
    await page.locator('#cadastro-senha').fill('senha1234');
    await page.locator('#form-cadastro button[type="submit"]').click();

    await expect.poll(() => mensagemDe(page, 'cadastro-nome')).toBe('Nome do servidor');
    expect(await mensagemDe(page, 'cadastro-senha')).toBe('Senha do servidor');
    expect(await mensagemDe(page, 'cadastro-email')).toBeNull();
    await expect(page.locator('#cadastro-nome')).toBeFocused();
    await expect(page.locator('#form-cadastro [role="alert"]')).toHaveCount(0);
  });

  test('o login mostra cada mensagem do servidor no seu campo e foca o primeiro', async ({ page }) => {
    await responder400(page, { status: 400, mensagem: 'Dados inválidos.', campos: { senha: 'Senha do servidor', email: 'E-mail do servidor' } });
    await page.goto('login.html');
    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    await page.locator('#form-login button[type="submit"]').click();

    await expect.poll(() => mensagemDe(page, 'email')).toBe('E-mail do servidor');
    expect(await mensagemDe(page, 'senha')).toBe('Senha do servidor');
    await expect(page.locator('#email')).toBeFocused();
  });

  test('o botão volta ao normal e a mensagem do servidor é ligada ao campo por aria-describedby', async ({ page }) => {
    await responder400(page, { status: 400, mensagem: 'Dados inválidos.', campos: { email: 'E-mail do servidor' } });
    await page.goto('login.html');
    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    const botao = page.locator('#form-login button[type="submit"]');
    await botao.click();

    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#email')).toHaveAttribute('aria-describedby', 'email-erro');
    await expect(botao).toBeEnabled();
    await expect(botao).toHaveText('Login');
  });

  test('um 400 sem campos mostra o alerta de conexão', async ({ page }) => {
    await responder400(page, { status: 400, mensagem: 'Corpo da requisição inválido.', campos: {} });
    await page.goto('login.html');
    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    await page.locator('#form-login button[type="submit"]').click();

    await expect(page.locator('#form-login [role="alert"]')).toHaveText(MSG_CONEXAO);
  });
});
