// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-packs/spec.md, revision 2 (LIST-*,
// HOME-*, EDGE-03; a pack is one style for one pedalboard model), which carries the etapa04 list behaviours (CAT, FILT, EMPTY, EDGE-01)
// over to packs. Expected values are computed from the mock API with the spec
// rules, so editing the sample data does not break the tests; the rules come
// from the spec, not from the page code.

const API = 'http://127.0.0.1:3000';
const formatoBRL = (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

/** Packs as the spec defines them: each with its presets (by packId) and newest preset date. */
async function lerPacks(page) {
  const [packs, presets] = await Promise.all([
    page.request.get(`${API}/packs`).then((r) => r.json()),
    page.request.get(`${API}/presets`).then((r) => r.json()),
  ]);
  return packs.map((pack) => {
    const doPack = presets.filter((p) => p.packId === pack.id);
    return {
      ...pack,
      presets: doPack,
      data: doPack.map((p) => p.data).sort().at(-1) ?? '',
    };
  });
}

const porData = (a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);

/** Lowercase, accent-free form of a text: the spec's matching rule for search. */
function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** The fields LIST-07 (rev. 2) searches for one pack. */
const camposDaBusca = (pack) =>
  [pack.nome, pack.descricao, pack.equipamento, ...pack.presets.flatMap((p) => [p.nome, p.descricao])].map(semAcento);

/** Names of the packs whose search fields contain `termo` (already accent-free and lowercase). */
const nomesComTexto = (page, termo) => nomesOnde(page, (p) => camposDaBusca(p).some((c) => c.includes(termo)));

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
  for (const pagina of ['index.html', 'pack.html?id=rock-boss-gt-1000', 'biblioteca.html', 'login.html']) {
    test(`${pagina} mostra o menu sem o link Presets`, async ({ page }) => {
      await page.goto(pagina);
      await expect(page.locator('.nav-links a')).toHaveText(['Página Inicial', 'Packs', 'Biblioteca']);
    });
  }

  // LIST-05: one card per pack, newest first (by newest preset date).
  test('mostra um card por pack, do mais recente ao mais antigo', async ({ page }) => {
    await abrirLista(page);
    const esperado = [...await lerPacks(page)].sort(porData).reverse().map((p) => p.nome);
    expect(esperado).toHaveLength(9);
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  // LIST-05 (rev. 2): card content and link; no brands line.
  test('cada card mostra nome, quantidade de presets e preço, e leva ao pack', async ({ page }) => {
    await abrirLista(page);
    for (const pack of await lerPacks(page)) {
      const cartao = page.locator('.grade-presets .cartao', { has: page.locator('.cartao-nome', { hasText: pack.nome }) });
      const n = pack.presets.length;
      await expect(cartao.locator('.cartao-quantidade')).toHaveText(n === 1 ? '1 preset' : `${n} presets`);
      await expect(cartao.locator('.cartao-marcas')).toHaveCount(0);
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

  // LIST-13 and etapa04 CAT-01: the brand filter offers exactly the brands of the packs; no option is a dead end.
  test('o filtro de marcas oferece só Boss, Line 6, NUX e Zoom, e cada opção acha algum pack', async ({ page }) => {
    await abrirLista(page);
    const packs = await lerPacks(page);
    const marcas = await page.locator('input[name="marca"]').evaluateAll((els) => els.map((el) => el.value));
    const estilos = await page.locator('input[name="estilo"]').evaluateAll((els) => els.map((el) => el.value));
    expect(marcas).toEqual(['boss', 'line6', 'nux', 'zoom']);
    expect([...new Set(packs.map((p) => p.marca))].sort()).toEqual([...marcas].sort());
    for (const estilo of estilos) expect(packs.some((p) => p.estilo === estilo), estilo).toBe(true);
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
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
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

test.describe('etapa05-packs T3 - brand and style filters (LIST-06, rev. 2)', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLista(page);
  });

  test('marcar uma marca mostra só os packs daquela marca', async ({ page }) => {
    await page.locator('#marca-boss').check();
    const esperado = await nomesOnde(page, (p) => p.marca === 'boss');
    expect(esperado).toHaveLength(3);
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  test('duas marcas mostram os packs de uma ou de outra (OU)', async ({ page }) => {
    await page.locator('#marca-zoom').check();
    await page.locator('#marca-line6').check();
    const esperado = await nomesOnde(page, (p) => p.marca === 'zoom' || p.marca === 'line6');
    expect(esperado).toHaveLength(4);
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  test('marcar um estilo mostra só os packs daquele estilo', async ({ page }) => {
    await page.locator('#estilo-blues').check();
    const esperado = await nomesOnde(page, (p) => p.estilo === 'blues');
    expect(esperado).toHaveLength(2);
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
  });

  test('marca e estilo juntos exigem os dois (E)', async ({ page }) => {
    await page.locator('#marca-zoom').check();
    await page.locator('#estilo-rock').check();
    expect(await nomesVisiveis(page)).toEqual(['Rock · Zoom G6']);

    // Zoom AND metal: no pack has both, while Zoom OR metal would show four.
    await page.locator('#estilo-rock').uncheck();
    await page.locator('#estilo-metal').check();
    const ou = await nomesOnde(page, (p) => p.marca === 'zoom' || p.estilo === 'metal');
    expect(ou).toHaveLength(4);
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
  });

  test('desmarcar tudo mostra os 9 packs de novo', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.locator('#estilo-rock').check();
    await page.locator('#marca-boss').uncheck();
    await page.locator('#estilo-rock').uncheck();
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
  });

  // LIST-09: "Aplicar" never reloads.
  test('"Aplicar" mantém a página e a lista filtrada', async ({ page }) => {
    const url = page.url();
    await page.evaluate(() => { window.semRecarregar = true; });
    await page.locator('#marca-nux').check();
    await page.getByRole('button', { name: 'Aplicar' }).click();
    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    expect((await nomesVisiveis(page)).sort()).toEqual(['Clean · NUX MG-30', 'Metal · NUX MG-30']);
  });
});

test.describe('etapa05-packs T3 - search (LIST-07, rev. 2)', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLista(page);
  });

  test('o nome de um preset encontra o pack que o contém', async ({ page }) => {
    await page.getByLabel('Buscar').fill('djent');
    const esperado = await nomesComTexto(page, 'djent');
    expect(esperado).toEqual(['Metal · NUX MG-30']);
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  test('maiúsculas e acentos são ignorados', async ({ page }) => {
    const esperado = await nomesComTexto(page, 'distorcao');
    expect(esperado.length).toBeGreaterThan(1);
    await page.getByLabel('Buscar').fill('DISTORCAO');
    expect((await nomesVisiveis(page)).sort()).toEqual(esperado.sort());
    await page.getByLabel('Buscar').fill('apice');
    expect(await nomesVisiveis(page)).toEqual(['Rock · Zoom G6']);
  });

  test('o modelo da pedaleira encontra os packs dele, ignorando espaços em volta', async ({ page }) => {
    await page.getByLabel('Buscar').fill('  g6  ');
    expect((await nomesVisiveis(page)).sort()).toEqual(['Clean · Zoom G6', 'Rock · Zoom G6']);
    await page.getByLabel('Buscar').fill('hx stomp');
    expect((await nomesVisiveis(page)).sort()).toEqual(['Blues · Line 6 HX Stomp', 'Rock · Line 6 HX Stomp']);
  });

  // LIST-07 equipamento branch (Verifier gap): in the sample data the name always
  // contains the model, so this pack's name leaves it out on purpose.
  test('a busca acha o modelo mesmo quando ele não está no nome do pack', async ({ page }) => {
    await page.route(`${API}/packs`, (rota) => rota.fulfill({ json: [
      { id: 'a', nome: 'Pack A', estilo: 'rock', marca: 'boss', equipamento: 'Katana', descricao: 'x', precoCentavos: 4990 },
      { id: 'b', nome: 'Pack B', estilo: 'rock', marca: 'boss', equipamento: 'GT-1000', descricao: 'y', precoCentavos: 4990 },
    ] }));
    await page.route(`${API}/presets`, (rota) => rota.fulfill({ json: [] }));
    await page.goto('packs.html');
    await expect(page.locator('#contagem')).toHaveText('2 packs encontrados');
    await page.getByLabel('Buscar').fill('katana');
    expect(await nomesVisiveis(page)).toEqual(['Pack A']);
  });

  test('a busca acha o nome e a descrição do próprio pack', async ({ page }) => {
    await page.getByLabel('Buscar').fill('clean · nux');
    expect(await nomesVisiveis(page)).toEqual(['Clean · NUX MG-30']);
    // "talo" is only in the description of the HX Stomp rock pack, in no preset.
    const esperado = await nomesComTexto(page, 'talo');
    expect(esperado).toEqual(['Rock · Line 6 HX Stomp']);
    const presets = await page.request.get(`${API}/presets`).then((r) => r.json());
    expect(presets.some((p) => semAcento(p.descricao).includes('talo'))).toBe(false);
    await page.getByLabel('Buscar').fill('talo');
    expect(await nomesVisiveis(page)).toEqual(esperado);
  });

  test('só espaços não restringe a lista', async ({ page }) => {
    await page.getByLabel('Buscar').fill('   ');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
  });

  test('busca e filtros se somam (E)', async ({ page }) => {
    await page.locator('#marca-boss').check();
    await page.getByLabel('Buscar').fill('djent');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(0);
    await page.locator('#marca-boss').uncheck();
    await page.locator('#marca-nux').check();
    expect(await nomesVisiveis(page)).toEqual(['Metal · NUX MG-30']);
  });

  test('Enter na busca não recarrega a página', async ({ page }) => {
    await page.evaluate(() => { window.semRecarregar = true; });
    await page.getByLabel('Buscar').fill('djent');
    await page.getByLabel('Buscar').press('Enter');
    expect(await page.evaluate(() => window.semRecarregar)).toBe(true);
    expect(await nomesVisiveis(page)).toEqual(['Metal · NUX MG-30']);
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

  // LIST-08 pt-BR collation (Verifier gap, lesson L-003): names whose pt-BR order
  // differs from plain code-point order.
  test('"Nome (A-Z)" usa a ordem do português, não a ordem dos códigos dos caracteres', async ({ page }) => {
    const nomes = ['Blues · B', 'acústico · A', 'Ácido · C', 'zumbido · D'];
    const ptBR = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const codigos = [...nomes].sort();
    expect(ptBR).not.toEqual(codigos);
    await page.route(`${API}/packs`, (rota) => rota.fulfill({ json: nomes.map((nome, i) => (
      { id: `p${i}`, nome, estilo: 'rock', marca: 'boss', equipamento: 'GT-1000', descricao: 'x', precoCentavos: 4990 })) }));
    await page.route(`${API}/presets`, (rota) => rota.fulfill({ json: [] }));
    await page.goto('packs.html');
    await expect(page.locator('#contagem')).toHaveText('4 packs encontrados');
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });
    expect(await nomesVisiveis(page)).toEqual(ptBR);
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
    await page.locator('#marca-zoom').check();
    await page.getByLabel('Ordenar por').selectOption({ label: 'Nome (A-Z)' });
    expect(await nomesVisiveis(page)).toEqual(['Clean · Zoom G6', 'Rock · Zoom G6']);
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
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
    expect(await nomesVisiveis(page)).toEqual([...await lerPacks(page)].sort(porData).reverse().map((p) => p.nome));
  });
});

test.describe('etapa05-packs T3 - count and empty state (LIST-10, LIST-11)', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLista(page);
  });

  test('a região ao vivo anuncia os 9 packs ao carregar', async ({ page }) => {
    const status = page.locator('#contagem');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText('9 packs encontrados');
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
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
    await expect(page.locator('#contagem')).toHaveText('9 packs encontrados');
  });
});

test.describe('etapa05-packs T4 - packs on the home page', () => {
  // HOME-01 (also slice 1 API-03/05): the carousel fetches the catalogue and shows packs, newest first.
  test('o carrossel "Packs" mostra um card por pack, do mais recente ao mais antigo', async ({ page }) => {
    const pedidoPacks = page.waitForRequest(`${API}/packs`);
    const pedidoPresets = page.waitForRequest(`${API}/presets`);
    await page.goto('index.html');
    await Promise.all([pedidoPacks, pedidoPresets]);

    await expect(page.locator('.tituloCarrossel h2')).toHaveText('Packs');
    const esperado = [...await lerPacks(page)].sort(porData).reverse();
    await expect(page.locator('.carrossel .cartao')).toHaveCount(esperado.length);
    const nomes = (await page.locator('.carrossel .cartao-nome').allTextContents()).map((n) => n.trim());
    expect(nomes).toEqual(esperado.map((p) => p.nome));
    for (const [i, pack] of esperado.entries()) {
      const cartao = page.locator('.carrossel .cartao').nth(i);
      await expect(cartao).toHaveAttribute('href', `pack.html?id=${pack.id}`);
      await expect(cartao.locator('.cartao-preco')).toHaveText(formatoBRL(pack.precoCentavos));
    }
  });

  // HOME-02
  test('a página inicial não mostra nenhum card de preset', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.locator('.carrossel .cartao')).toHaveCount(9);
    const presets = await page.request.get(`${API}/presets`).then((r) => r.json());
    const textos = await page.locator('.cartao').allTextContents();
    for (const preset of presets) {
      expect(textos.some((t) => t.includes(preset.nome)), preset.nome).toBe(false);
    }
  });
});
