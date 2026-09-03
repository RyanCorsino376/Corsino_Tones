const { test, expect } = require('@playwright/test');

// Tests derive from spec.md acceptance criteria, not from the markup.

test.describe('T3 - two-faced login markup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // FLIP-07: The registration face SHALL collect name, e-mail and password.
  test('registration face collects name, e-mail and password, all required', async ({ page }) => {
    const nome = page.locator('#cadastro-nome');
    const email = page.locator('#cadastro-email');
    const senha = page.locator('#cadastro-senha');

    await expect(nome).toHaveAttribute('autocomplete', 'name');
    await expect(email).toHaveAttribute('type', 'email');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(senha).toHaveAttribute('type', 'password');
    await expect(senha).toHaveAttribute('autocomplete', 'new-password');

    for (const campo of [nome, email, senha]) {
      expect(await campo.evaluate((el) => el.required)).toBe(true);
    }
  });

  // Both toggles must be type="button": a bare <button> inside a <form>
  // defaults to type="submit" and would submit the form instead of flipping.
  test('both toggle buttons declare type="button"', async ({ page }) => {
    await expect(page.locator('[data-alvo="cadastro"]')).toHaveAttribute('type', 'button');
    await expect(page.locator('[data-alvo="login"]')).toHaveAttribute('type', 'button');
  });

  // EDGE-01: IF a required registration field is empty on submit THEN the
  // browser SHALL block submission and report the offending field.
  test('submitting registration with an empty required field is blocked and reported', async ({ page }) => {
    // Reach the form the way a user does. With the script running the
    // registration face is inert until the card is flipped, and inert is
    // exactly what FLIP-05 requires.
    await page.locator('[data-alvo="cadastro"]').click();

    await page.locator('#cadastro-nome').fill('Ryan Corsino');
    await page.locator('#cadastro-email').fill('ryan@example.com');
    // password intentionally left empty

    await page.locator('#form-cadastro button[type="submit"]').click();

    expect(await page.locator('#cadastro-senha').evaluate((el) => el.validity.valueMissing)).toBe(true);
    // The browser focuses the first invalid control when it blocks a submit.
    expect(await page.evaluate(() => document.activeElement.id)).toBe('cadastro-senha');
  });
});

test.describe('T4 - face toggle: state, inert and focus', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  test('activating "Não tenho conta" presents the registration face', async ({ page }) => {
    await page.locator('[data-alvo="cadastro"]').click();
    await expect(page.locator('.cartao-login')).toHaveAttribute('data-vista', 'cadastro');
  });

  test('activating "Já tenho conta" returns to the login face', async ({ page }) => {
    await page.locator('[data-alvo="cadastro"]').click();
    // Without this the test would pass on a no-op implementation: data-vista
    // starts at "login", so asserting "login" at the end proves nothing.
    await expect(page.locator('.cartao-login')).toHaveAttribute('data-vista', 'cadastro');

    await page.locator('[data-alvo="login"]').click();
    await expect(page.locator('.cartao-login')).toHaveAttribute('data-vista', 'login');
  });

  // FLIP-04 / FLIP-05: the hidden face's controls leave the tab order.
  test('the hidden face carries inert in both directions', async ({ page }) => {
    expect(await page.locator('.face-cadastro').evaluate((el) => el.inert)).toBe(true);
    expect(await page.locator('.face-login').evaluate((el) => el.inert)).toBe(false);

    await page.locator('[data-alvo="cadastro"]').click();

    expect(await page.locator('.face-login').evaluate((el) => el.inert)).toBe(true);
    expect(await page.locator('.face-cadastro').evaluate((el) => el.inert)).toBe(false);
  });

  test('tabbing never reaches a control on the hidden face', async ({ page }) => {
    await page.locator('[data-alvo="cadastro"]').click();

    const visitados = [];
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      visitados.push(await page.evaluate(() => document.activeElement.id));
    }

    // #email and #senha belong to the now-hidden login face.
    expect(visitados).not.toContain('email');
    expect(visitados).not.toContain('senha');
    expect(visitados).toContain('cadastro-email');
  });

  // FLIP-03: focus moves to the revealed face's first input.
  test('focus moves to the first input of the revealed face', async ({ page }) => {
    await page.locator('[data-alvo="cadastro"]').click();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('cadastro-nome');

    await page.locator('[data-alvo="login"]').click();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('email');
  });

  // FLIP-09: rapid activations settle on the most recent one.
  test('three rapid alternating activations settle on the last one', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('[data-alvo="cadastro"]').click();
      document.querySelector('[data-alvo="login"]').click();
      document.querySelector('[data-alvo="cadastro"]').click();
    });

    await expect(page.locator('.cartao-login')).toHaveAttribute('data-vista', 'cadastro');
    expect(await page.locator('.face-login').evaluate((el) => el.inert)).toBe(true);
  });
});

test.describe('T5 - 3D flip styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // FLIP-01 / FLIP-02: rotate 180deg on the Y axis, and back to 0.
  test('the card rotates 180 degrees on the Y axis and back', async ({ page }) => {
    const cartao = page.locator('.cartao-login');
    const lerTransform = () => cartao.evaluate((el) => getComputedStyle(el).transform);

    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(await lerTransform());

    await page.locator('[data-alvo="cadastro"]').click();
    await page.waitForTimeout(700);
    // rotateY(180deg) computes to matrix3d with m11 = -1.
    expect(await lerTransform()).toMatch(/^matrix3d\(-1,/);

    await page.locator('[data-alvo="login"]').click();
    await page.waitForTimeout(700);
    // Back at 0deg the browser drops the property entirely, so the computed
    // value is "none" - the same identity the card started at.
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(await lerTransform());
  });

  test('the rotation runs over 600ms', async ({ page }) => {
    const duracao = await page
      .locator('.cartao-login')
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duracao).toBe('0.6s');
  });

  // FLIP-06: the card occupies the same height on both faces.
  // Measured on the faces, not the card: the card's own height is constant
  // even with no flip styling at all, so it cannot detect a wrong layout.
  test('both faces occupy the same height', async ({ page }) => {
    const alturaLogin = (await page.locator('.face-login').boundingBox()).height;
    const alturaCadastro = (await page.locator('.face-cadastro').boundingBox()).height;

    expect(alturaLogin).toBe(alturaCadastro);
  });

  // FLIP-06: no surrounding element moves during the rotation.
  test('the footer stays put throughout the rotation', async ({ page }) => {
    const rodape = page.locator('.rodape');
    const inicial = (await rodape.boundingBox()).y;

    await page.locator('[data-alvo="cadastro"]').click();

    const amostras = [];
    for (let i = 0; i < 6; i += 1) {
      amostras.push((await rodape.boundingBox()).y);
      await page.waitForTimeout(100);
    }

    expect([...new Set(amostras)]).toEqual([inicial]);
    // Without this the test passes on a page where nothing rotates at all.
    expect(
      await page.locator('.cartao-login').evaluate((el) => getComputedStyle(el).transform),
    ).toMatch(/^matrix3d\(-1,/);
  });

  // EDGE-03: crossing a breakpoint keeps the presented face.
  test('crossing a breakpoint keeps the registration face presented', async ({ page }) => {
    await page.locator('[data-alvo="cadastro"]').click();

    await page.setViewportSize({ width: 820, height: 1180 });
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('.cartao-login')).toHaveAttribute('data-vista', 'cadastro');
    expect(await page.locator('.face-login').evaluate((el) => el.inert)).toBe(true);
  });
});

// FLIP-08: WHERE prefers-reduced-motion: reduce, change faces with no rotation.
test.describe('T5 - reduced motion', () => {
  test('faces switch with no transition when motion is reduced', async ({ page }) => {
    await page.goto('login.html');
    // page.emulateMedia rather than test.use({ reducedMotion }): the fixture
    // form does not reach the page here - matchMedia still reported
    // no-preference - while this one does.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const cartao = page.locator('.cartao-login');
    expect(await cartao.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');

    await page.locator('[data-alvo="cadastro"]').click();
    await expect(cartao).toHaveAttribute('data-vista', 'cadastro');

    // No wait: with the transition suppressed the final matrix applies on the
    // first frame. Under a 600ms transition this would still read an
    // intermediate value, so the assertion distinguishes the two.
    expect(await cartao.evaluate((el) => getComputedStyle(el).transform)).toMatch(/^matrix3d\(-1,/);
    expect(await page.locator('.face-cadastro').evaluate((el) => el.inert)).toBe(false);
  });
});

// FLIP-10: IF JavaScript does not run THEN the system SHALL present the login
// form and the registration form stacked, both fully usable.
test.describe('T3 - no-JavaScript fallback', () => {
  test.use({ javaScriptEnabled: false });

  test('both forms are present and fillable without JavaScript', async ({ page }) => {
    await page.goto('login.html');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#senha')).toBeVisible();
    await expect(page.locator('#cadastro-nome')).toBeVisible();
    await expect(page.locator('#cadastro-email')).toBeVisible();
    await expect(page.locator('#cadastro-senha')).toBeVisible();

    await page.locator('#email').fill('ryan@example.com');
    await page.locator('#cadastro-nome').fill('Ryan Corsino');

    await expect(page.locator('#email')).toHaveValue('ryan@example.com');
    await expect(page.locator('#cadastro-nome')).toHaveValue('Ryan Corsino');
  });
});
