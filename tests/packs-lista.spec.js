// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-packs/spec.md (LIST-*, HOME-*,
// EDGE-03), which carries the etapa04 list behaviours (CAT, FILT, EMPTY, EDGE-01)
// over to packs. Expected values are computed from the mock API with the spec
// rules, so editing the sample data does not break the tests; the rules come
// from the spec, not from the page code.

const API = 'http://127.0.0.1:3000';
const formatoBRL = (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
const ROTULOS_MARCA = {
  boss: 'Boss', line6: 'Line 6', nux: 'NUX', mooer: 'Mooer', zoom: 'Zoom', headrush: 'HeadRush', valeton: 'Valeton', hotone: 'Hotone',
};

/** Packs as the spec defines them: each with its presets, brands and newest preset date. */
async function lerPacks(page) {
  const [packs, presets] = await Promise.all([
    page.request.get(`${API}/packs`).then((r) => r.json()),
    page.request.get(`${API}/presets`).then((r) => r.json()),
  ]);
  return packs.map((pack) => {
    const doPack = presets.filter((p) => p.estilo === pack.id);
    return {
      ...pack,
      presets: doPack,
      marcas: [...new Set(doPack.map((p) => p.marca))],
      data: doPack.map((p) => p.data).sort().at(-1) ?? '',
    };
  });
}

const porData = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);

/** Lowercase, accent-free form of a text: the spec's matching rule for search. */
function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** The fields LIST-07 searches for one pack. */
const camposDaBusca = (pack) =>
  [pack.nome, pack.descricao, ...pack.presets.flatMap((p) => [p.nome, p.equipamento, p.descricao])].map(semAcento);

/** Names of the packs accepted by `regra`, in any order. */
async function nomesOnde(page, regra) {
  return (await lerPacks(page)).filter(regra).map((p) => p.nome);
}

/** Opens packs.html and waits until the catalogue has loaded. */
async function abrirLista(page) {
  await page.goto('packs.html');
  await expect(page.locator('#contagem')).toHaveText(/encontrados?$/);
}

/** Names of the cards currently rendered in the grid, in order. */
async function nomesVisiveis(page) {
  return (await page.locator('.grade-presets .cartao-nome').allTextContents()).map((n) => n.trim());
}

test.describe('etapa05-packs T3 - pack cards on packs.html', () => {
  // LIST-01
  test('o menu mostra Página Inicial, Packs e Biblioteca, com Packs marcado em packs.html', async ({ page }) => {
    await abrirLista(page);
    const links = page.locator('.nav-links a');
    await expect(links).toHaveText(['Página Inicial', 'Packs', 'Biblioteca']);
    await expect(page.locator('.nav-links a', { hasText: 'Packs' })).toHaveAttribute('href', 'packs.html');
    await expect(page.locator('.nav-links a', { hasText: 'Packs' })).toHaveAttribute('aria-current', 'page');
  });

  // LIST-01: the same menu on the other pages.
  for (const pagina of ['index.html', 'biblioteca.html', 'login.html']) {
    test(`${pagina} mostra o menu sem o link Presets`, async ({ page }) => {
      await page.goto(pagina);
      await expect(page.locator('.nav-links a')).toHaveText(['Página Inicial', 'Packs', 'Biblioteca']);
    });
  }

  // LIST-05: one card per pack, newest first (by newest preset date).
  test('mostra um card por pack, do mais recente ao mais antigo', async ({ page }) => {
    await abrirLista(page);
    const esperado = [...await lerPacks(page)].sort(porData).reverse().map((p) => p.nome);
    expect(esperado).toHaveLength(4);
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(4);
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  // LIST-05: card content and link.
  test('cada card mostra nome, quantidade de presets, marcas e preço, e leva ao pack', async ({ page }) => {
    await abrirLista(page);
    for (const pack of await lerPacks(page)) {
      const cartao = page.locator('.grade-presets .cartao', { has: page.locator('.cartao-nome', { hasText: pack.nome }) });
      const n = pack.presets.length;
      await expect(cartao.locator('.cartao-quantidade')).toHaveText(n === 1 ? '1 preset' : `${n} presets`);
      const marcas = pack.marcas.map((m) => ROTULOS_MARCA[m]).sort((a, b) => a.localeCompare(b, 'pt-BR')).join(', ');
      await expect(cartao.locator('.cartao-marcas')).toHaveText(marcas);
      await expect(cartao.locator('.cartao-preco')).toHaveText(formatoBRL(pack.precoCentavos));
      await expect(cartao).toHaveAttribute('href', `pack.html?id=${pack.id}`);
    }
  });

  // LIST-12: no preset card, i.e. no card names a preset.
  test('nenhum card é de preset', async ({ page }) => {
    await abrirLista(page);
    const presets = await page.request.get(`${API}/presets`).then((r) => r.json());
    const textos = await page.locator('.cartao').allTextContents();
    for (const preset of presets) {
      expect(textos.some((t) => t.includes(preset.nome)), preset.nome).toBe(false);
    }
  });

  // Carried from etapa04 CAT-01: no filter option is a guaranteed dead end.
  test('cada marca e cada estilo dos filtros corresponde a pelo menos um pack', async ({ page }) => {
    await abrirLista(page);
    const packs = await lerPacks(page);
    const marcas = await page.locator('input[name="marca"]').evaluateAll((els) => els.map((el) => el.value));
    const estilos = await page.locator('input[name="estilo"]').evaluateAll((els) => els.map((el) => el.value));
    for (const marca of marcas) expect(packs.some((p) => p.marcas.includes(marca)), marca).toBe(true);
    for (const estilo of estilos) expect(packs.some((p) => p.id === estilo), estilo).toBe(true);
  });

  // LIST-02: both reads start without waiting for each other.
  test('packs.html pede /presets enquanto /packs ainda não respondeu', async ({ page }) => {
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${API}/packs`, async (rota) => { await liberado; await rota.continue(); });
    const pedidoPresets = page.waitForRequest(`${API}/presets`);
    await page.goto('packs.html');
    await pedidoPresets;
    liberar();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(4);
  });

  // LIST-05 / slice 1 API-04: the cards are what the API returns, not a bundled copy.
  test('a lista mostra exatamente os packs que a API devolve', async ({ page }) => {
    await page.route(`${API}/packs`, (rota) => rota.fulfill({ json: [{ id: 'rock', nome: 'Pack Só da API', descricao: 'x', precoCentavos: 1234 }] }));
    await page.goto('packs.html');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(1);
    expect(await nomesVisiveis(page)).toEqual(['Pack Só da API']);
    await expect(page.locator('.cartao-preco')).toHaveText(formatoBRL(1234));
  });

  // Slice 1 REG-02 on packs: an empty catalogue is a success with the empty state.
  test('uma lista vazia da API mostra "0 packs encontrados" e o estado vazio', async ({ page }) => {
    await page.route(`${API}/packs`, (rota) => rota.fulfill({ json: [] }));
    await page.goto('packs.html');
    await expect(page.locator('#contagem')).toHaveText('0 packs encontrados');
    await expect(page.getByText('Nenhum pack encontrado')).toBeVisible();
  });
});

// Carried from etapa04 CAT-05.
test.describe('etapa05-packs T3 - no-JavaScript fallback', () => {
  test.use({ javaScriptEnabled: false });

  test('sem JavaScript, uma mensagem diz que a lista precisa dele', async ({ page }) => {
    await page.goto('packs.html');
    await expect(page.getByText(/requer JavaScript/i)).toBeVisible();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
  });
});

test.describe('etapa05-packs T3 - brand and style filters (LIST-06)', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLista(page);
  });

  test('marcar uma marca mostra só os packs com algum preset dela', async ({ page }) => {
    await page.locator('#marca-boss').check();
    const esperado = await nomesOnde(page, (p) => p.marcas.includes('boss'));
    expect(esperado).toEqual(['Pack Rock']);
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  test('duas marcas mostram os packs de uma ou de outra (OU)', async ({ page }) => {
    await page.locator('#marca-nux').check();
    await page.locator('#marca-hotone').check();
    const esperado = await nomesOnde(page, (p) => p.marcas.includes('nux') || p.marcas.includes('hotone'));
    expect(esperado.length).toBe(2);
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  test('marcar um estilo mostra só o pack daquele estilo', async ({ page }) => {
    await page.locator('#estilo-blues').check();
    expect(await nomesVisiveis(page)).toEqual(['Pack Blues']);
  });

  test('marca e estilo juntos exigem os dois (E)', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#estilo-rock').check();
    expect(await nomesVisiveis(page)).toEqual(['Pack Rock']);

    // Boss AND metal: no pack has both, while Boss OR metal would show two.
    await page.locator('#estilo-rock').uncheck();
    await page.locator('#estilo-metal').check();
    const ou = await nomesOnde(page, (p) => p.marcas.includes('boss') || p.id === 'metal');
    expect(ou.length).toBe(2);
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
  });

  test('desmarcar tudo mostra os 4 packs de novo', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#estilo-rock').check();
    await page.locator('#marca-boss').uncheck();
    await page.locator('#estilo-rock').uncheck();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(4);
  });

  // LIST-09: "Aplicar" never reloads.
  test('"Aplicar" mantém a página e a lista filtrada', async ({ page }) => {
    const url = page.url();
    await page.evaluate(() => { window.semRecarregar = true; });
    await page.locator('#marca-nux').check();
    await page.getByRole('button', { name: 'Aplicar' }).click();
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    expect(await nomesVisiveis(page)).toEqual(['Pack Metal']);
  });
});

test.describe('etapa05-packs T3 - search (LIST-07)', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLista(page);
  });

  test('o nome de um preset encontra o pack que o contém', async ({ page }) => {
    await page.getByLabel('Buscar').fill('djent');
    const esperado = await nomesOnde(page, (p) => camposDaBusca(p).some((c) => c.includes('djent')));
    expect(esperado).toEqual(['Pack Metal']);
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  test('maiúsculas e acentos são ignorados', async ({ page }) => {
    // "Distorção" is in a metal preset name and in a rock preset description.
    const esperado = await nomesOnde(page, (p) => camposDaBusca(p).some((c) => c.includes('distorcao')));
    expect(esperado.sort()).toEqual(['Pack Metal', 'Pack Rock']);
    await page.getByLabel('Buscar').fill('DISTORCAO');
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado);
    await page.getByLabel('Buscar').fill('apice');
    expect(await nomesVisiveis(page)).toEqual(['Pack Rock']);
  });

  test('a busca acha o equipamento e ignora espaços em volta', async ({ page }) => {
    await page.getByLabel('Buscar').fill('  gp-200  ');
    expect(await nomesVisiveis(page)).toEqual(['Pack Blues']);
  });

  test('a busca acha o nome e a descrição do próprio pack', async ({ page }) => {
    await page.getByLabel('Buscar').fill('pack clean');
    expect(await nomesVisiveis(page)).toEqual(['Pack Clean']);
    // "palheta" is only in the Blues pack description, in no preset.
    const esperado = await nomesOnde(page, (p) => camposDaBusca(p).some((c) => c.includes('palheta')));
    expect(esperado).toEqual(['Pack Blues']);
    await page.getByLabel('Buscar').fill('palheta');
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  test('só espaços não restringe a lista', async ({ page }) => {
    await page.getByLabel('Buscar').fill('   ');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(4);
  });

  test('busca e filtros se somam (E)', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.getByLabel('Buscar').fill('djent');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
    await page.locator('#marca-boss').uncheck();
    await page.locator('#marca-headrush').check();
    expect(await nomesVisiveis(page)).toEqual(['Pack Metal']);
  });

  test('Enter na busca não recarrega a página', async ({ page }) => {
    await page.evaluate(() => { window.semRecarregar = true; });
    await page.getByLabel('Buscar').fill('djent');
    await page.getByLabel('Buscar').press('Enter');
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    expect(await nomesVisiveis(page)).toEqual(['Pack Metal']);
  });

  test('caracteres de expressão regular são procurados como texto, sem erro', async ({ page }) => {
    const erros = [];
    page.on('pageerror', (erro) => erros.push(erro.message));
    for (const termo of ['(', '.*', '[']) {
      await page.getByLabel('Buscar').fill(termo);
      await expect(page.locator('.grade-presets .cartao'), `term ${termo}`).toHaveCount(0);
    }
    expect(erros).toEqual([]);
  });
});

test.describe('etapa05-packs T3 - sort and reset (LIST-08, LIST-09)', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLista(page);
  });

  test('as três ordens dão listas diferentes nos dados de exemplo', async ({ page }) => {
    const packs = await lerPacks(page);
    const recentes = [...packs].sort(porData).reverse().map((p) => p.nome);
    const antigos = [...packs].sort(porData).map((p) => p.nome);
    const nome = packs.map((p) => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(new Set([recentes.join(), antigos.join(), nome.join()]).size).toBe(3);
  });

  test('"Mais antigos" ordena pela data do preset mais novo de cada pack, crescente', async ({ page }) => {
    await page.getByLabel('Ordenar por').selectOption({ label: 'Mais antigos' });
    expect(await nomesVisiveis(page)).toEqual([...await lerPacks(page)].sort(porData).map((p) => p.nome));
  });

  test('"Nome (A-Z)" ordena pelo nome do pack', async ({ page }) => {
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });
    const esperado = (await lerPacks(page)).map((p) => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  test('"Mais recentes" volta à ordem padrão', async ({ page }) => {
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });
    await page.getByLabel('Ordenar por').selectOption({ label: 'Mais recentes' });
    expect(await nomesVisiveis(page)).toEqual([...await lerPacks(page)].sort(porData).reverse().map((p) => p.nome));
  });

  test('a ordem vale só para os packs filtrados', async ({ page }) => {
    await page.locator('#marca-nux').check();
    await page.locator('#marca-hotone').check();
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });
    expect(await nomesVisiveis(page)).toEqual(['Pack Clean', 'Pack Metal']);
  });

  test('"Limpar" desmarca filtros, esvazia a busca, volta a ordem e mostra todos os packs', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#estilo-rock').check();
    await page.getByLabel('Buscar').fill('crunch');
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });

    await page.getByRole('button', { name: 'Limpar' }).click();

    await expect(page.locator('#form-filtros input[type="checkbox"]:checked')).toHaveCount(0);
    await expect(page.getByLabel('Buscar')).toHaveValue('');
    await expect(page.getByLabel('Ordenar por')).toHaveValue('recentes');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(4);
    expect(await nomesVisiveis(page)).toEqual([...await lerPacks(page)].sort(porData).reverse().map((p) => p.nome));
  });
});

test.describe('etapa05-packs T3 - count and empty state (LIST-10, LIST-11)', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLista(page);
  });

  test('a região ao vivo anuncia os 4 packs ao carregar', async ({ page }) => {
    const status = page.locator('#contagem');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText('4 packs encontrados');
  });

  test('um único resultado usa o singular', async ({ page }) => {
    await page.getByLabel('Buscar').fill('djent');
    await expect(page.locator('#contagem')).toHaveText('1 pack encontrado');
  });

  test('busca sem resultado mostra o estado vazio e nenhum card', async ({ page }) => {
    await expect(page.getByText('Nenhum pack encontrado')).toBeHidden();
    await page.getByLabel('Buscar').fill('zzzz');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
    await expect(page.getByText('Nenhum pack encontrado')).toBeVisible();
    await expect(page.locator('.lista-vazia')).toContainText('Limpar');
    await expect(page.locator('#contagem')).toHaveText('0 packs encontrados');
  });

  test('apagar a busca tira a mensagem e traz os cards de volta', async ({ page }) => {
    await page.getByLabel('Buscar').fill('zzzz');
    await expect(page.getByText('Nenhum pack encontrado')).toBeVisible();
    await page.getByLabel('Buscar').fill('');
    await expect(page.getByText('Nenhum pack encontrado')).toBeHidden();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(4);
    await expect(page.locator('#contagem')).toHaveText('4 packs encontrados');
  });
});
