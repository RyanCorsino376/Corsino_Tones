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
    await page.locator('#cadastro-nome').fill('Ryan Corsino');
    await page.locator('#cadastro-email').fill('ryan@example.com');
    // password intentionally left empty

    await page.locator('#form-cadastro button[type="submit"]').click();

    expect(await page.locator('#cadastro-senha').evaluate((el) => el.validity.valueMissing)).toBe(true);
    // The browser focuses the first invalid control when it blocks a submit.
    expect(await page.evaluate(() => document.activeElement.id)).toBe('cadastro-senha');
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
