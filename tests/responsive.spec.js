const { test, expect } = require('@playwright/test');

// Tests derive from spec.md acceptance criteria. Each test names the viewport
// its criterion applies to, matching how the criteria are written
// ("WHILE the viewport is narrower than 768px...").

const MOBILE = { width: 375, height: 667 };
const MOBILE_LIMITE = { width: 767, height: 900 };
const TABLET_INICIO = { width: 768, height: 1024 };
const TABLET = { width: 820, height: 1180 };
const DESKTOP = { width: 1440, height: 900 };

/** True when the two boxes share vertical space, i.e. sit on the same line. */
function mesmaLinha(a, b) {
  return a.y < b.y + b.height && b.y < a.y + a.height;
}

test.describe('T6 - navigation across the three ranges', () => {
  // RESP-05: below 768px the nav links wrap and "Entrar" leaves absolute flow.
  test('below 768px the "Entrar" link drops below the navigation links', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('index.html');

    const links = await page.locator('.nav-links').boundingBox();
    const entrar = await page.locator('.entrar').boundingBox();

    expect(mesmaLinha(links, entrar)).toBe(false);
    expect(entrar.y).toBeGreaterThan(links.y);
  });

  test('below 768px the "Entrar" link is in normal flow', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('index.html');

    const posicao = await page.locator('.entrar').evaluate((el) => getComputedStyle(el).position);
    expect(posicao).toBe('static');
  });

  // Boundary: 767px is still the mobile range.
  test('at 767px the mobile navigation layout still applies', async ({ page }) => {
    await page.setViewportSize(MOBILE_LIMITE);
    await page.goto('index.html');

    const posicao = await page.locator('.entrar').evaluate((el) => getComputedStyle(el).position);
    expect(posicao).toBe('static');
  });

  // Boundary: 768px is the first tablet width.
  test('at 768px the "Entrar" link returns to the navigation line', async ({ page }) => {
    await page.setViewportSize(TABLET_INICIO);
    await page.goto('index.html');

    const links = await page.locator('.nav-links').boundingBox();
    const entrar = await page.locator('.entrar').boundingBox();

    expect(mesmaLinha(links, entrar)).toBe(true);
    expect(await page.locator('.entrar').evaluate((el) => getComputedStyle(el).position)).toBe('absolute');
  });

  test('at 820px the "Entrar" link does not overlap the navigation links', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('index.html');

    const links = await page.locator('.nav-links').boundingBox();
    const entrar = await page.locator('.entrar').boundingBox();

    // Absolutely positioned, it can sit on top of the links if they are too wide.
    expect(links.x + links.width).toBeLessThanOrEqual(entrar.x);
  });

  test('at 1440px the "Entrar" link sits on the navigation line, absolutely positioned', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('index.html');

    const links = await page.locator('.nav-links').boundingBox();
    const entrar = await page.locator('.entrar').boundingBox();

    expect(mesmaLinha(links, entrar)).toBe(true);
    expect(await page.locator('.entrar').evaluate((el) => getComputedStyle(el).position)).toBe('absolute');
  });
});
