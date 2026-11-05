const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa04-interatividade/spec.md (VAL-*, EDGE-02, EDGE-03).
// Messages are only required to be Portuguese and per field, so the tests check
// that they exist, differ and are linked, not their exact wording.
// VAL-06 is superseded by .specs/features/etapa05-auth/spec.md (AUTH-01, CAD-01):
// a valid form now reaches the server and an invalid one sends nothing. Those
// requests are intercepted here, so validation tests never write to the database.

const API_USUARIOS = 'http://127.0.0.1:3000/usuarios';

/** Answers every /usuarios request locally and records it as "METHOD url". */
async function interceptarUsuarios(page) {
  const pedidos = [];
  await page.route(`${API_USUARIOS}**`, (rota) => {
    const req = rota.request();
    pedidos.push(`${req.method()} ${req.url()}`);
    return req.method() === 'POST'
      ? rota.fulfill({ status: 201, json: { id: 999, ...req.postDataJSON() } })
      : rota.fulfill({ json: [] });
  });
  return pedidos;
}

/** The message element linked to a field through aria-describedby. */
function mensagemDe(page, id) {
  return page.locator(`#${id}`).evaluate((campo) => {
    const alvo = campo.getAttribute('aria-describedby');
    const mensagem = alvo && document.getElementById(alvo);
    return mensagem ? mensagem.textContent.trim() : null;
  });
}

async function abrirCadastro(page) {
  await page.goto('login.html');
  await page.locator('[data-alvo="cadastro"]').click();
}

async function enviarCadastro(page, nome, email, senha) {
  await page.locator('#cadastro-nome').fill(nome);
  await page.locator('#cadastro-email').fill(email);
  await page.locator('#cadastro-senha').fill(senha);
  await page.locator('#form-cadastro button[type="submit"]').click();
}

async function enviarLogin(page, email, senha) {
  await page.locator('#email').fill(email);
  await page.locator('#senha').fill(senha);
  await page.locator('#form-login button[type="submit"]').click();
}

test.describe('T7 - registration validation on submit', () => {
  test.beforeEach(async ({ page }) => {
    await abrirCadastro(page);
  });

  // VAL-01, VAL-03, VAL-04: three rejections, three distinct linked messages, focus on the first.
  test('rejects a short name, a bad e-mail and a short password with three messages', async ({ page }) => {
    await enviarCadastro(page, 'R', 'ryan@', '1234567');

    const ids = ['cadastro-nome', 'cadastro-email', 'cadastro-senha'];
    for (const id of ids) {
      await expect(page.locator(`#${id}`), id).toHaveAttribute('aria-invalid', 'true');
    }
    const mensagens = await Promise.all(ids.map((id) => mensagemDe(page, id)));
    for (const mensagem of mensagens) expect(mensagem).toBeTruthy();
    expect(new Set(mensagens).size).toBe(3);
    await expect(page.locator('#cadastro-nome')).toBeFocused();
  });

  // VAL-01, CAD-02: the boundary values are accepted, so the account reaches the server.
  test('accepts "Ry", "ryan@x.com" and an 8-character password', async ({ page }) => {
    const pedidos = await interceptarUsuarios(page);
    // The POST is left unanswered so the page stays (a success would redirect)
    // and the fields can still be checked.
    await page.route(API_USUARIOS, (rota) => {
      if (rota.request().method() !== 'POST') return rota.fallback();
      pedidos.push(`POST ${API_USUARIOS}`);
    });
    await enviarCadastro(page, 'Ry', 'ryan@x.com', '12345678');

    for (const id of ['cadastro-nome', 'cadastro-email', 'cadastro-senha']) {
      await expect(page.locator(`#${id}`), id).not.toHaveAttribute('aria-invalid', 'true');
    }
    await expect.poll(() => pedidos).toContain(`POST ${API_USUARIOS}`);
  });

  // VAL-04: focus lands on the first rejected field, not simply the first field.
  test('focus moves to the first rejected field', async ({ page }) => {
    await enviarCadastro(page, 'Ryan', 'ryan@', '1234567');

    // The browser's own validation would also focus the e-mail; aria-invalid proves the script ran.
    await expect(page.locator('#cadastro-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cadastro-email')).toBeFocused();
    await expect(page.locator('#cadastro-nome')).not.toHaveAttribute('aria-invalid', 'true');
  });

  // EDGE-02: whitespace-only is empty.
  test('whitespace-only fields are rejected', async ({ page }) => {
    await enviarCadastro(page, '   ', '   ', '        ');

    for (const id of ['cadastro-nome', 'cadastro-email', 'cadastro-senha']) {
      await expect(page.locator(`#${id}`), id).toHaveAttribute('aria-invalid', 'true');
    }
  });

  // EDGE-03: a second invalid submit does not duplicate messages.
  test('a second invalid submit shows each message once', async ({ page }) => {
    await enviarCadastro(page, 'R', 'ryan@', '1234567');
    await page.locator('#form-cadastro button[type="submit"]').click();

    await expect(page.locator('.face-cadastro fieldset')).toHaveCount(3);
    for (const campo of await page.locator('.face-cadastro fieldset').all()) {
      await expect(campo.locator('.erro-campo')).toHaveCount(1);
    }
  });

  // VAL-06 superseded by CAD-02/CAD-04: a valid submit sends the account to the server and signs in.
  test('a valid submit sends the account to the server and signs in', async ({ page }) => {
    const enviado = page.waitForRequest((req) => req.url() === API_USUARIOS && req.method() === 'POST');
    await interceptarUsuarios(page);

    await enviarCadastro(page, 'Ryan Corsino', 'ryan@example.com', 'senhaForte1');

    expect((await enviado).postDataJSON()).toEqual({ nome: 'Ryan Corsino', email: 'ryan@example.com', senha: 'senhaForte1' });
    await expect(page).toHaveURL(/\/frontend\/index\.html$/);
  });

  // VAL-04, CAD-01: an invalid submit sends nothing to the server.
  test('an invalid submit sends no request', async ({ page }) => {
    const pedidos = await interceptarUsuarios(page);
    await enviarCadastro(page, 'R', 'ryan@', '1234567');

    // aria-invalid proves the script ran, so an empty list is not vacuous.
    await expect(page.locator('#cadastro-nome')).toHaveAttribute('aria-invalid', 'true');
    expect(pedidos).toEqual([]);
  });
});

test.describe('T7 - login validation on submit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // VAL-02, VAL-03, VAL-04, AUTH-01: bad e-mail and empty password are both rejected, and nothing is sent.
  test('rejects a bad e-mail and an empty password', async ({ page }) => {
    const pedidos = await interceptarUsuarios(page);
    await enviarLogin(page, 'ryan@x', '');

    for (const id of ['email', 'senha']) {
      await expect(page.locator(`#${id}`), id).toHaveAttribute('aria-invalid', 'true');
      expect(await mensagemDe(page, id), id).toBeTruthy();
    }
    await expect(page.locator('#email')).toBeFocused();
    expect(pedidos).toEqual([]);
  });

  // VAL-02, AUTH-02: login does not apply the 8-character rule, so a short password reaches the server.
  test('accepts a short password on login', async ({ page }) => {
    const pedidos = await interceptarUsuarios(page);
    await enviarLogin(page, 'ryan@x.com', '123');

    await expect(page.locator('#senha')).not.toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => pedidos).toEqual([`GET ${API_USUARIOS}?email=ryan%40x.com`]);
  });
});

test.describe('T8 - clear messages while the user fixes a field', () => {
  test.beforeEach(async ({ page }) => {
    await abrirCadastro(page);
  });

  // VAL-05: fixing one field clears only that field, with no new submit.
  test('fixing the name removes only its message while typing', async ({ page }) => {
    await enviarCadastro(page, 'R', 'ryan@', '1234567');
    await expect(page.locator('.face-cadastro .erro-campo')).toHaveCount(3);

    await page.locator('#cadastro-nome').pressSequentially('y');

    await expect(page.locator('#cadastro-nome')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cadastro-nome')).not.toHaveAttribute('aria-describedby');
    await expect(page.locator('#cadastro-nome-erro')).toHaveCount(0);
    await expect(page.locator('#cadastro-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cadastro-senha')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.face-cadastro .erro-campo')).toHaveCount(2);
  });

  // VAL-05: a field still invalid after an edit keeps its message.
  test('an edit that leaves the field invalid keeps its message', async ({ page }) => {
    await enviarCadastro(page, 'R', 'ryan@', '1234567');

    await page.locator('#cadastro-email').pressSequentially('x');

    await expect(page.locator('#cadastro-email')).toHaveAttribute('aria-invalid', 'true');
    expect(await mensagemDe(page, 'cadastro-email')).toBeTruthy();
  });

  // VAL-05 boundary: before any submit, typing shows nothing.
  test('typing before any submit shows no messages', async ({ page }) => {
    await page.locator('#cadastro-nome').pressSequentially('R');
    await page.locator('#cadastro-email').pressSequentially('ryan@');

    await expect(page.locator('.face-cadastro .erro-campo')).toHaveCount(0);
    await expect(page.locator('.face-cadastro [aria-invalid="true"]')).toHaveCount(0);
  });
});

test.describe('T7 - e-mail rule applies to the whole value', () => {
  // VAL-01, VAL-02: the rule is anchored at both ends, so a valid-looking part
  // does not rescue a value with extra text before or after it.
  for (const email of ['ryan silva@x.com', 'ryan@x.com silva']) {
    test(`registration rejects "${email}"`, async ({ page }) => {
      await abrirCadastro(page);
      await enviarCadastro(page, 'Ryan', email, '12345678');

      await expect(page.locator('#cadastro-email')).toHaveAttribute('aria-invalid', 'true');
    });

    test(`login rejects "${email}"`, async ({ page }) => {
      await page.goto('login.html');
      await enviarLogin(page, email, '123');

      await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    });
  }
});

test.describe('T7 - message wording', () => {
  // VAL-03: each rejected field shows the exact message the spec defines.
  test('registration shows the spec messages for name, e-mail and password', async ({ page }) => {
    await abrirCadastro(page);
    await enviarCadastro(page, 'R', 'ryan@', '1234567');

    expect(await mensagemDe(page, 'cadastro-nome')).toBe('Informe um nome com pelo menos 2 caracteres.');
    expect(await mensagemDe(page, 'cadastro-email')).toBe('Informe um e-mail válido, como nome@exemplo.com.');
    expect(await mensagemDe(page, 'cadastro-senha')).toBe('A senha precisa ter pelo menos 8 caracteres.');
  });

  test('login shows the spec messages for e-mail and password', async ({ page }) => {
    await page.goto('login.html');
    await enviarLogin(page, 'ryan@x', '');

    expect(await mensagemDe(page, 'email')).toBe('Informe um e-mail válido, como nome@exemplo.com.');
    expect(await mensagemDe(page, 'senha')).toBe('Informe sua senha.');
  });
});
