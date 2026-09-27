const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa04-interatividade/spec.md.
// Expected counts and order are read from window.PRESETS so editing a sample
// preset does not break them; the rules themselves come from the spec.

const CAMPOS = ['id', 'nome', 'marca', 'equipamento', 'estilo', 'data', 'descricao'];
const ESTILOS = ['rock', 'blues', 'metal', 'clean'];

/** Catalogue entries sorted newest first, as the spec's default order requires. */
async function catalogoMaisRecentes(page) {
  return page.evaluate(() =>
    [...window.PRESETS].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)));
}

test.describe('T1 - preset catalogue rendered from data', () => {
  // CAT-01: the catalogue is an array of 9 objects with the seven fields.
  test('the catalogue holds 9 presets with every required field', async ({ page }) => {
    await page.goto('presets.html');

    const presets = await page.evaluate(() => window.PRESETS);
    expect(Array.isArray(presets)).toBe(true);
    expect(presets).toHaveLength(9);
    for (const preset of presets) {
      for (const campo of CAMPOS) {
        expect(preset[campo], `${preset.nome} lacks ${campo}`).toBeTruthy();
      }
      expect(preset.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // Assumption table: every brand checkbox and each of the four styles is represented,
  // so no filter option can ever be a guaranteed dead end.
  test('every brand checkbox and every style appears in the catalogue', async ({ page }) => {
    await page.goto('presets.html');

    const presets = await page.evaluate(() => window.PRESETS);
    const marcas = await page.locator('input[name="marca"]').evaluateAll((els) => els.map((el) => el.value));

    for (const marca of marcas) {
      expect(presets.some((p) => p.marca === marca), `brand ${marca}`).toBe(true);
    }
    for (const estilo of ESTILOS) {
      expect(presets.some((p) => p.estilo === estilo), `style ${estilo}`).toBe(true);
    }
    for (const preset of presets) {
      expect(ESTILOS).toContain(preset.estilo);
    }
  });

  // CAT-02: one card per entry, newest first.
  test('presets.html renders one card per preset, newest first', async ({ page }) => {
    await page.goto('presets.html');

    const esperado = await catalogoMaisRecentes(page);
    const cartoes = page.locator('.grade-presets .cartao');
    await expect(cartoes).toHaveCount(esperado.length);

    const nomes = await page.locator('.grade-presets .cartao-nome').allTextContents();
    expect(nomes.map((n) => n.trim())).toEqual(esperado.map((p) => p.nome));
  });

  // CAT-03: each card shows name, brand + equipment and style, and links to preset.html.
  test('each card shows name, brand and equipment, style, and links to the detail page', async ({ page }) => {
    await page.goto('presets.html');

    const esperado = await catalogoMaisRecentes(page);
    const cartoes = page.locator('.grade-presets .cartao');

    for (let i = 0; i < esperado.length; i++) {
      const cartao = cartoes.nth(i);
      const texto = (await cartao.textContent()).toLowerCase();
      expect(texto).toContain(esperado[i].nome.toLowerCase());
      expect(texto).toContain(esperado[i].equipamento.toLowerCase());
      // Brand and style are shown with display labels; their keys ("line6")
      // may differ from the label ("Line 6"), so compare without spaces.
      expect(texto.replace(/\s/g, '')).toContain(esperado[i].marca);
      expect(texto).toContain(esperado[i].estilo);
      await expect(cartao).toHaveAttribute('href', 'preset.html');
    }
  });
});

// CAT-05: without JavaScript the page says the list needs it.
test.describe('T1 - no-JavaScript fallback on presets', () => {
  test.use({ javaScriptEnabled: false });

  test('without JavaScript a message says the list requires it', async ({ page }) => {
    await page.goto('presets.html');

    await expect(page.getByText(/requer JavaScript/i)).toBeVisible();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
  });
});

test.describe('T2 - home carousel rendered from the catalogue', () => {
  // CAT-04: the carousel shows the catalogue, newest first.
  test('index.html fills the carousel with every preset, newest first', async ({ page }) => {
    await page.goto('index.html');

    const esperado = await catalogoMaisRecentes(page);
    await expect(page.locator('.carrossel .cartao')).toHaveCount(esperado.length);

    const nomes = await page.locator('.carrossel .cartao-nome').allTextContents();
    expect(nomes.map((n) => n.trim())).toEqual(esperado.map((p) => p.nome));
    await expect(page.locator('.carrossel .cartao').first()).toHaveAttribute('href', 'preset.html');
  });
});

/** Names of the cards currently rendered in the preset grid, in order. */
async function nomesVisiveis(page) {
  return (await page.locator('.grade-presets .cartao-nome').allTextContents()).map((n) => n.trim());
}

/** Names of the catalogue entries accepted by `regra`, in any order. */
async function nomesOnde(page, regra) {
  const presets = await page.evaluate(() => window.PRESETS);
  return presets.filter(regra).map((p) => p.nome);
}

test.describe('T3 - brand and style filters without reload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('presets.html');
  });

  // FILT-01: one checked brand shows only that brand.
  test('checking one brand shows only presets of that brand', async ({ page }) => {
    await page.locator('#marca-boss').check();

    const esperado = await nomesOnde(page, (p) => p.marca === 'boss');
    expect(esperado.length).toBeGreaterThan(0);
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  // FILT-01: brands inside one group combine with OR.
  test('checking two brands shows presets of either brand', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#marca-nux').check();

    const esperado = await nomesOnde(page, (p) => p.marca === 'boss' || p.marca === 'nux');
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  // FILT-02: one checked style shows only that style.
  test('checking one style shows only presets of that style', async ({ page }) => {
    await page.locator('#estilo-blues').check();

    const esperado = await nomesOnde(page, (p) => p.estilo === 'blues');
    expect(esperado.length).toBeGreaterThan(0);
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  // FILT-03: groups combine with AND. Boss + rock differs from Boss OR rock.
  test('a brand and a style together show only presets matching both', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#estilo-rock').check();

    const e = await nomesOnde(page, (p) => p.marca === 'boss' && p.estilo === 'rock');
    const ou = await nomesOnde(page, (p) => p.marca === 'boss' || p.estilo === 'rock');
    expect(e.length).toBeLessThan(ou.length); // guards the test's own power
    expect((await nomesVisiveis(page)).sort()).toEqual(e.sort());
  });

  // FILT-04: an empty group does not restrict.
  test('unchecking every box shows the whole catalogue again', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#estilo-rock').check();
    await page.locator('#marca-boss').uncheck();
    await page.locator('#estilo-rock').uncheck();

    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
  });

  // FILT-08: "Aplicar" updates the list and never reloads the page.
  test('"Aplicar" keeps the page loaded and the list filtered', async ({ page }) => {
    const url = page.url();
    await page.evaluate(() => { window.semRecarregar = true; });

    await page.locator('#marca-nux').check();
    await page.getByRole('button', { name: 'Aplicar' }).click();

    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    const esperado = await nomesOnde(page, (p) => p.marca === 'nux');
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });
});

/** Lowercase, accent-free form of a text: the spec's matching rule for search. */
function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

test.describe('T4 - text search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('presets.html');
  });

  const campos = (p) => [p.nome, p.equipamento, p.descricao].map(semAcento).join(' ');

  // FILT-05: case- and accent-insensitive over name, equipment and description.
  test('an unaccented, uppercase term finds accented presets', async ({ page }) => {
    await page.getByLabel('Buscar').fill('DISTORCAO');

    const esperado = await nomesOnde(page, (p) => campos(p).includes('distorcao'));
    expect(esperado).toContain('Distorção Moderna');
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  // FILT-05: equipment is searched too, and surrounding whitespace is ignored.
  test('search matches equipment and ignores surrounding whitespace', async ({ page }) => {
    await page.getByLabel('Buscar').fill('  hx stomp  ');

    expect(await nomesVisiveis(page)).toEqual(await nomesOnde(page, (p) => p.equipamento === 'HX Stomp'));
  });

  // FILT-06: whitespace-only search does not restrict.
  test('a whitespace-only search shows every preset', async ({ page }) => {
    await page.getByLabel('Buscar').fill('   ');

    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
  });

  // FILT-05 with FILT-01: search and filters combine with AND.
  test('search combines with the checked filters', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.getByLabel('Buscar').fill('distorcao');

    const esperado = await nomesOnde(page, (p) => p.marca === 'boss' && campos(p).includes('distorcao'));
    const soBusca = await nomesOnde(page, (p) => campos(p).includes('distorcao'));
    expect(esperado.length).toBeLessThan(soBusca.length);
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  // FILT-08 for the search field: Enter must not reload the page.
  test('pressing Enter in the search keeps the page loaded', async ({ page }) => {
    await page.evaluate(() => { window.semRecarregar = true; });
    await page.getByLabel('Buscar').fill('djent');
    await page.getByLabel('Buscar').press('Enter');

    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    expect(await nomesVisiveis(page)).toEqual(['Djent Preciso']);
  });

  // EDGE-01: regular-expression characters are literal and never throw.
  test('regular-expression characters are searched literally without errors', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (erro) => erros.push(erro.message));

    for (const termo of ['(', '.*', '[']) {
      await page.getByLabel('Buscar').fill(termo);
      await expect(page.locator('.grade-presets .cartao'), `term ${termo}`).toHaveCount(0);
    }
    expect(erros).toEqual([]);
  });
});

test.describe('T5 - sort order and full reset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('presets.html');
  });

  const porData = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);

  // FILT-07: oldest first.
  test('"Mais antigos" lists presets from the oldest date', async ({ page }) => {
    await page.getByLabel('Ordenar por').selectOption({ label: 'Mais antigos' });

    const presets = await page.evaluate(() => window.PRESETS);
    expect(await nomesVisiveis(page)).toEqual([...presets].sort(porData).map((p) => p.nome));
  });

  // FILT-07: name A-Z with pt-BR collation.
  test('"Nome (A-Z)" lists presets alphabetically', async ({ page }) => {
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });

    const presets = await page.evaluate(() => window.PRESETS);
    const esperado = presets.map((p) => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  // FILT-07: back to newest first.
  test('"Mais recentes" restores newest first', async ({ page }) => {
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });
    await page.getByLabel('Ordenar por').selectOption({ label: 'Mais recentes' });

    const presets = await page.evaluate(() => window.PRESETS);
    expect(await nomesVisiveis(page)).toEqual([...presets].sort(porData).reverse().map((p) => p.nome));
  });

  // FILT-07: the order applies to the filtered list, not to the whole catalogue.
  test('ordering applies to the filtered presets only', async ({ page }) => {
    await page.locator('#estilo-rock').check();
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });

    const esperado = (await nomesOnde(page, (p) => p.estilo === 'rock')).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  // FILT-09: "Limpar" resets every control and shows the whole catalogue newest first.
  test('"Limpar" unchecks filters, empties search, restores order and shows every preset', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#estilo-rock').check();
    await page.getByLabel('Buscar').fill('crunch');
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });

    await page.getByRole('button', { name: 'Limpar' }).click();

    await expect(page.locator('#form-filtros input[type="checkbox"]:checked')).toHaveCount(0);
    await expect(page.getByLabel('Buscar')).toHaveValue('');
    await expect(page.getByLabel('Ordenar por')).toHaveValue('recentes');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
    const presets = await page.evaluate(() => window.PRESETS);
    expect(await nomesVisiveis(page)).toEqual([...presets].sort(porData).reverse().map((p) => p.nome));
  });
});

test.describe('T6 - result count and empty state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('presets.html');
  });

  // EMPTY-01: the count lives in a polite live region and uses the plural form.
  test('the live region announces every preset on load', async ({ page }) => {
    const status = page.getByRole('status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText('9 presets encontrados');
  });

  // EMPTY-01: singular form for exactly one match.
  test('a single match is announced in the singular', async ({ page }) => {
    await page.getByLabel('Buscar').fill('djent');

    await expect(page.getByRole('status')).toHaveText('1 preset encontrado');
  });

  // EMPTY-02: no match renders no cards, the message and a hint to clear the filters.
  test('a search with no match shows the empty state and no cards', async ({ page }) => {
    await expect(page.getByText('Nenhum preset encontrado')).toBeHidden();

    await page.getByLabel('Buscar').fill('zzzz');

    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
    await expect(page.getByText('Nenhum preset encontrado')).toBeVisible();
    await expect(page.locator('.lista-vazia')).toContainText('Limpar');
    // EMPTY-01: zero takes the plural form, like any N other than 1.
    await expect(page.getByRole('status')).toHaveText('0 presets encontrados');
  });

  // EMPTY-03: matches coming back remove the message.
  test('clearing the search removes the message and restores the cards', async ({ page }) => {
    await page.getByLabel('Buscar').fill('zzzz');
    await expect(page.getByText('Nenhum preset encontrado')).toBeVisible();

    await page.getByLabel('Buscar').fill('');

    await expect(page.getByText('Nenhum preset encontrado')).toBeHidden();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
    await expect(page.getByRole('status')).toHaveText('9 presets encontrados');
  });
});
