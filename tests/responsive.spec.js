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

/** Box of the filter sidebar and of the results column on presets.html. */
async function caixasLayout(page) {
  return {
    filtros: await page.locator('.filtros').boundingBox(),
    resultados: await page.locator('.conteudo').boundingBox(),
  };
}

/** Column count read from the rendered X positions of the preset cards. */
async function colunasGrade(page) {
  return page.locator('.grade-presets .cartao').evaluateAll((cartoes) =>
    new Set(cartoes.map((c) => Math.round(c.getBoundingClientRect().x))).size);
}

test.describe('T7 - filter sidebar and preset grid per range', () => {
  // RESP-02: below 768px the sidebar stacks above the results.
  test('at 375px the filter sidebar sits above the results', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('presets.html');

    const { filtros, resultados } = await caixasLayout(page);
    expect(filtros.y + filtros.height).toBeLessThanOrEqual(resultados.y);
  });

  // RESP-02: below 768px the preset grid renders one column.
  test('at 375px the preset grid renders one column', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('presets.html');

    expect(await colunasGrade(page)).toBe(1);
  });

  // RESP-03: between 768px and 1023px the sidebar stacks above the results.
  test('at 820px the filter sidebar sits above the results', async ({ page }) => {
    await page.setViewportSize(TABLET);
    await page.goto('presets.html');

    const { filtros, resultados } = await caixasLayout(page);
    expect(filtros.y + filtros.height).toBeLessThanOrEqual(resultados.y);
  });

  // RESP-03: exactly two columns across the whole tablet range, both edges included.
  // 820px alone is not enough: an auto-fill grid beside the sidebar also lands on two there.
  test('from 768px to 1023px the preset grid renders exactly two columns', async ({ page }) => {
    for (const width of [768, 820, 1023]) {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto('presets.html');

      expect(await colunasGrade(page), `at ${width}px`).toBe(2);
    }
  });

  // RESP-04: from 1024px up the sidebar sits beside the results.
  test('at 1440px the filter sidebar sits beside the results', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('presets.html');

    const { filtros, resultados } = await caixasLayout(page);
    expect(filtros.x + filtros.width).toBeLessThanOrEqual(resultados.x);
    expect(mesmaLinha(filtros, resultados)).toBe(true);
  });

  // RESP-04: the sidebar column is sticky.
  test('at 1440px the filter sidebar is a sticky column', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('presets.html');

    const posicao = await page.locator('.filtros-fixos').evaluate((el) => getComputedStyle(el).position);
    expect(posicao).toBe('sticky');
  });
});

const PAGINAS = ['index.html', 'presets.html', 'preset.html', 'biblioteca.html', 'login.html'];

/** Column count read from the rendered X positions of the grid's direct children. */
async function colunasPresetTopo(page) {
  return page.locator('.preset-topo > *').evaluateAll((filhos) =>
    new Set(filhos.map((f) => Math.round(f.getBoundingClientRect().x))).size);
}

test.describe('T8 - preset detail, login card fit and no horizontal overflow', () => {
  // RESP-01: exactly three ranges. The desktop range is the base stylesheet,
  // so the width media queries must be the mobile and tablet ranges and nothing else.
  test('the stylesheet expresses its width rules through exactly three ranges', async ({ page }) => {
    await page.goto('index.html');

    const condicoes = await page.evaluate(() => {
      const regras = [...document.styleSheets].flatMap((folha) => [...folha.cssRules]);
      return [...new Set(regras
        .filter((r) => r instanceof CSSMediaRule && r.conditionText.includes('width'))
        .map((r) => r.conditionText))].sort();
    });

    expect(condicoes).toEqual([
      '(max-width: 767px)',
      '(min-width: 768px) and (max-width: 1023px)',
    ]);
  });

  // RESP-06: below 768px the preset detail top section is one column.
  test('below 768px the preset detail top section renders one column', async ({ page }) => {
    for (const width of [320, 375, 767]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('preset.html');

      expect(await colunasPresetTopo(page), `at ${width}px`).toBe(1);
    }
  });

  // T8 Done-when: from 1024px up the preset detail top section is two columns.
  test('from 1024px the preset detail top section renders two columns', async ({ page }) => {
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('preset.html');

      expect(await colunasPresetTopo(page), `at ${width}px`).toBe(2);
    }
  });

  // RESP-08: below 768px the login card fits inside the viewport width.
  test('at 320px and 375px the login card fits inside the viewport', async ({ page }) => {
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('login.html');

      const cartao = await page.locator('.cartao-login').boundingBox();
      expect(cartao.x, `at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(cartao.x + cartao.width, `at ${width}px`).toBeLessThanOrEqual(width);
    }
  });

  // RESP-08: both faces keep the same height while narrowed.
  test('at 320px and 375px both login faces keep the same height', async ({ page }) => {
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('login.html');

      const alturaLogin = (await page.locator('.face-login').boundingBox()).height;
      const alturaCadastro = (await page.locator('.face-cadastro').boundingBox()).height;
      expect(alturaLogin, `at ${width}px`).toBe(alturaCadastro);
    }
  });

  // RESP-07: no horizontal page scrolling from 320px upward, on every page.
  for (const width of [320, 375, 820, 1440]) {
    test(`at ${width}px no page scrolls horizontally`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const pagina of PAGINAS) {
        await page.goto(pagina);
        const larguraRolavel = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(larguraRolavel, pagina).toBeLessThanOrEqual(width);
      }
    });
  }

  // EDGE-02: a registration face taller than the viewport scrolls the page, unclipped.
  test('a registration face taller than the viewport scrolls the page without clipping', async ({ page }) => {
    // Reduced motion settles the flip at once, so the geometry is final when measured.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 360 });
    await page.goto('login.html');
    await page.locator('[data-alvo="cadastro"]').click();

    const cartao = await page.locator('.cartao-login').boundingBox();
    expect(cartao.height).toBeGreaterThan(360);

    const rolagem = await page.evaluate(() => ({
      altura: document.documentElement.scrollHeight,
      janela: window.innerHeight,
    }));
    expect(rolagem.altura).toBeGreaterThan(rolagem.janela);

    // The last control on the face must be reachable by scrolling.
    const enviar = page.locator('.face-cadastro [type="submit"]');
    await enviar.scrollIntoViewIfNeeded();
    await expect(enviar).toBeInViewport({ ratio: 1 });
  });
});
