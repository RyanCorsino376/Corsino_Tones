// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-auth/spec.md: AUTH-*, PROT-02..04,
// EDGE-02 (login, T5) and CAD-* (registration, T6), now served by Spring
// (.specs/features/etapa06-front-spring-auth/spec.md: WEB-01..03, WEB-05, WEB-07..09,
// WEB-11, WEB-12). Tests that expect a success or a refusal run against the real
// Spring server started by playwright.config.js; those that need a failure or a
// pending request intercept it.

const API_AUTH = 'http://127.0.0.1:8081/auth';
const CHAVE = 'corsino:sessao';
const MSG_CREDENCIAIS = 'E-mail ou senha incorretos.';
const MSG_CONEXAO = 'Não foi possível conectar ao servidor. Tente novamente.';

const lerSessao = (page) => page.evaluate((chave) => sessionStorage.getItem(chave), CHAVE);

async function enviarLogin(page, email, senha) {
  await page.locator('#email').fill(email);
  await page.locator('#senha').fill(senha);
  await page.locator('#form-login button[type="submit"]').click();
}

/** Holds every Spring auth request until the returned function is called with 'continue' or 'abort'. */
async function segurarAuth(page) {
  let decidir;
  const decisao = new Promise((resolver) => { decidir = resolver; });
  await page.route(`${API_AUTH}/**`, async (rota) => {
    const acao = await decisao;
    return acao === 'abort' ? rota.abort() : rota.continue();
  });
  return decidir;
}

test.describe('etapa05-auth T5 - login through the API', () => {
  // AUTH-02, AUTH-03, PROT-02
  test('e-mail e senha corretos abrem a sessão e levam à página inicial', async ({ page }) => {
    await page.goto('login.html');
    const pedido = page.waitForRequest((req) => req.url() === `${API_AUTH}/login`);

    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');

    const req = await pedido;
    expect(req.method()).toBe('POST');
    expect(req.postDataJSON()).toEqual({ email: 'ryan@exemplo.com', senha: 'teste123' });
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    expect(JSON.parse(await lerSessao(page))).toEqual({ id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com' });
  });

  // AUTH-02, EDGE-01, WEB-18: the page sends the e-mail as typed; Spring lower-cases it, so the account is found.
  test('o e-mail digitado com maiúsculas e espaços encontra a conta', async ({ page }) => {
    await page.goto('login.html');
    const pedido = page.waitForRequest((req) => req.url() === `${API_AUTH}/login`);

    await enviarLogin(page, '  RYAN@Exemplo.com ', 'teste123');

    expect((await pedido).postDataJSON().email.trim()).toBe('RYAN@Exemplo.com');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    expect(JSON.parse(await lerSessao(page))).toEqual({ id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com' });
  });

  // PROT-02
  test('com ?voltar=biblioteca.html, o login leva à biblioteca', async ({ page }) => {
    await page.goto('login.html?voltar=biblioteca.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');
    await expect(page).toHaveURL(/\/frontend\/biblioteca\.html$/);
  });

  // PROT-03 (page half)
  test('um ?voltar= para outro site é ignorado e o login leva à página inicial', async ({ page }) => {
    await page.goto('login.html?voltar=https://evil.example');
    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:8080\/frontend\/index\.html$/);
  });

  // AUTH-04
  test('senha errada mostra o alerta, limpa a senha e não abre sessão', async ({ page }) => {
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'teste124');

    const alerta = page.locator('#form-login [role="alert"]');
    await expect(alerta).toHaveText(MSG_CREDENCIAIS);
    await expect(page.locator('#senha')).toHaveValue('');
    await expect(page.locator('#email')).toHaveValue('ryan@exemplo.com');
    expect(await lerSessao(page)).toBeNull();
    await expect(page).toHaveURL(/\/frontend\/login\.html$/);
  });

  // AUTH-04: an unknown e-mail gets the same message as a wrong password.
  test('e-mail sem conta mostra a mesma mensagem da senha errada', async ({ page }) => {
    await page.goto('login.html');
    await enviarLogin(page, `ninguem-${Date.now()}@exemplo.com`, 'teste123');
    await expect(page.locator('#form-login [role="alert"]')).toHaveText(MSG_CREDENCIAIS);
    expect(await lerSessao(page)).toBeNull();
  });

  // AUTH-05
  test('falha de comunicação mostra o alerta de conexão e mantém os valores', async ({ page }) => {
    await page.route(`${API_AUTH}/**`, (rota) => rota.abort());
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');

    await expect(page.locator('#form-login [role="alert"]')).toHaveText(MSG_CONEXAO);
    await expect(page.locator('#email')).toHaveValue('ryan@exemplo.com');
    await expect(page.locator('#senha')).toHaveValue('teste123');
    expect(await lerSessao(page)).toBeNull();
  });

  // AUTH-06, EDGE-02
  test('enquanto espera, o botão fica desativado com "Entrando..." e volta ao normal após falha', async ({ page }) => {
    const decidir = await segurarAuth(page);
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');

    const botao = page.locator('#form-login button[type="submit"]');
    await expect(botao).toBeDisabled();
    await expect(botao).toHaveText('Entrando...');

    decidir('abort');
    await expect(page.locator('#form-login [role="alert"]')).toHaveText(MSG_CONEXAO);
    await expect(botao).toBeEnabled();
    await expect(botao).toHaveText('Login');
  });

  // EDGE-02: a failed retry replaces the alert instead of adding another.
  test('duas falhas seguidas deixam um único alerta no formulário', async ({ page }) => {
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@exemplo.com', 'errada1');
    await expect(page.locator('#form-login [role="alert"]')).toHaveText(MSG_CREDENCIAIS);

    await enviarLogin(page, 'ryan@exemplo.com', 'errada2');
    await expect(page.locator('#form-login [role="alert"]')).toHaveCount(1);
    await expect(page.locator('#form-login [role="alert"]')).toHaveText(MSG_CREDENCIAIS);
  });

  // PROT-04
  test('abrir login.html com sessão leva direto à página inicial', async ({ page }) => {
    await page.goto('index.html');
    await page.evaluate((chave) => sessionStorage.setItem(chave, '{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}'), CHAVE);
    await page.goto('login.html');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
  });

  // PROT-04
  test('abrir login.html?voltar=packs.html com sessão leva direto aos packs', async ({ page }) => {
    await page.goto('index.html');
    await page.evaluate((chave) => sessionStorage.setItem(chave, '{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}'), CHAVE);
    await page.goto('login.html?voltar=packs.html');
    await expect(page).toHaveURL(/\/frontend\/packs\.html$/);
  });

  // AD-009: login.html is a module page now and the classic script is gone.
  test('login.html carrega um único script, como módulo, e login.js não existe mais', async ({ page }) => {
    await page.goto('login.html');
    const scripts = await page.locator('script').evaluateAll((els) => els.map((el) => [el.type, el.getAttribute('src')]));
    expect(scripts).toEqual([['module', 'paginas/login.js']]);
    expect(fs.existsSync(path.join(__dirname, '..', 'frontend', 'login.js'))).toBe(false);
  });
});

const MSG_EMAIL_EM_USO = 'Este e-mail já está cadastrado.';
const emailUnico = () => `teste-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemplo.com`;

async function enviarCadastro(page, nome, email, senha) {
  await page.locator('[data-alvo="cadastro"]').click();
  await page.locator('#cadastro-nome').fill(nome);
  await page.locator('#cadastro-email').fill(email);
  await page.locator('#cadastro-senha').fill(senha);
  await page.locator('#form-cadastro button[type="submit"]').click();
}

test.describe('etapa05-auth T6 - registration through the API', () => {
  // CAD-02, CAD-04, PROT-02
  test('um cadastro novo envia um único POST, abre a sessão e leva à página inicial', async ({ page, request }) => {
    const email = emailUnico();
    const posts = [];
    page.on('request', (req) => { if (req.method() === 'POST' && req.url() === `${API_AUTH}/cadastro`) posts.push(req.postDataJSON()); });
    await page.goto('login.html');
    await enviarCadastro(page, 'Ana Teste', email, 'senha1234');

    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
    expect(posts).toEqual([{ nome: 'Ana Teste', email, senha: 'senha1234' }]);
    const sessao = JSON.parse(await lerSessao(page));
    expect(sessao).toEqual({ id: expect.any(Number), nome: 'Ana Teste', email });
    // The account exists on the server: it signs in with the same password and the same id.
    const login = await request.post(`${API_AUTH}/login`, { data: { email, senha: 'senha1234' } });
    expect((await login.json()).usuario.id).toBe(sessao.id);
  });

  // PROT-02
  test('com ?voltar=biblioteca.html, o cadastro leva à biblioteca', async ({ page }) => {
    await page.goto('login.html?voltar=biblioteca.html');
    await enviarCadastro(page, 'Ana Teste', emailUnico(), 'senha1234');
    await expect(page).toHaveURL(/\/frontend\/biblioteca\.html$/);
  });

  // CAD-03, WEB-09: the server answers 409; the page points at the e-mail field.
  test('um e-mail já cadastrado é apontado no campo, com um único POST e sem sessão', async ({ page }) => {
    const posts = [];
    page.on('request', (req) => { if (req.method() === 'POST') posts.push(req.url()); });
    await page.goto('login.html');
    await enviarCadastro(page, 'Outra Pessoa', 'Ryan@Exemplo.com', 'senha1234');

    const campo = page.locator('#cadastro-email');
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    const idMensagem = await campo.getAttribute('aria-describedby');
    await expect(page.locator(`#${idMensagem}`)).toHaveText(MSG_EMAIL_EM_USO);
    expect(posts).toEqual([`${API_AUTH}/cadastro`]);
    expect(await lerSessao(page)).toBeNull();
    await expect(page).toHaveURL(/\/frontend\/login\.html$/);
  });

  // CAD-05
  test('falha no POST mostra o alerta de conexão e mantém os três valores', async ({ page }) => {
    await page.route(`${API_AUTH}/**`, (rota) => rota.abort());
    await page.goto('login.html');
    const email = emailUnico();
    await enviarCadastro(page, 'Ana Teste', email, 'senha1234');

    await expect(page.locator('#form-cadastro [role="alert"]')).toHaveText(MSG_CONEXAO);
    await expect(page.locator('#cadastro-nome')).toHaveValue('Ana Teste');
    await expect(page.locator('#cadastro-email')).toHaveValue(email);
    await expect(page.locator('#cadastro-senha')).toHaveValue('senha1234');
    expect(await lerSessao(page)).toBeNull();
  });

  // CAD-06, EDGE-02
  test('enquanto espera, o botão fica desativado com "Cadastrando..." e volta ao normal após falha', async ({ page }) => {
    const decidir = await segurarAuth(page);
    await page.goto('login.html');
    await enviarCadastro(page, 'Ana Teste', emailUnico(), 'senha1234');

    const botao = page.locator('#form-cadastro button[type="submit"]');
    await expect(botao).toBeDisabled();
    await expect(botao).toHaveText('Cadastrando...');

    decidir('abort');
    await expect(page.locator('#form-cadastro [role="alert"]')).toHaveText(MSG_CONEXAO);
    await expect(botao).toBeEnabled();
    await expect(botao).toHaveText('Cadastrar');
  });
});

test.describe('etapa05-auth Verifier fix - success replaces the login page in history', () => {
  // PROT-02 "replace the location" (Verifier gap, M13): with replace() the login
  // page leaves the history, so its length does not grow and "back" skips it.
  test('depois do login, o histórico não ganha entrada e "voltar" pula o login', async ({ page }) => {
    await page.goto('index.html');
    await page.goto('login.html');
    const tamanhoAntes = await page.evaluate(() => history.length);

    await enviarLogin(page, 'ryan@exemplo.com', 'teste123');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);

    expect(await page.evaluate(() => history.length)).toBe(tamanhoAntes);
    await page.goBack();
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
  });

  // PROT-02 for registration.
  test('depois do cadastro, o histórico não ganha entrada', async ({ page }) => {
    await page.goto('index.html');
    await page.goto('login.html');
    const tamanhoAntes = await page.evaluate(() => history.length);

    await enviarCadastro(page, 'Ana Teste', emailUnico(), 'senha1234');
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);

    expect(await page.evaluate(() => history.length)).toBe(tamanhoAntes);
  });
});
