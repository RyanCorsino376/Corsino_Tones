// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-packs/spec.md: LIST-02 (parallel
// reads), LIST-05 (card content), EDGE-02 (one read failing). Modules are
// imported in a host page.

const API = 'http://127.0.0.1:8081';
const formatoBRL = (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

/** montarPacks over the real API data, returned as plain objects. */
function packsMontados(page) {
  return page.evaluate(async () => {
    const { montarPacks } = await import('/frontend/servicos/catalogo.js');
    const [packs, presets] = await Promise.all([
      fetch('http://127.0.0.1:8081/packs').then((r) => r.json()),
      fetch('http://127.0.0.1:8081/presets').then((r) => r.json()),
    ]);
    return montarPacks(packs, presets);
  });
}

test.describe('etapa05-packs T2 - catalogue join, pack card and price', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // LIST-05 data (rev. 2): presets by packId and newest date per pack.
  test('montarPacks junta a cada pack os presets com o seu packId e a data mais recente', async ({ page }) => {
    const montados = await packsMontados(page);
    const presets = await page.request.get(`${API}/presets`).then((r) => r.json());

    expect(montados).toHaveLength(9);
    for (const pack of montados) {
      const doPack = presets.filter((p) => p.packId === pack.id);
      expect(pack.presets.map((p) => p.id).sort((a, b) => a - b), pack.id).toEqual(doPack.map((p) => p.id).sort((a, b) => a - b));
      expect(pack.data, pack.id).toBe(doPack.map((p) => p.data).sort().at(-1));
    }
    const rock = montados.find((p) => p.id === 'rock-boss-gt-1000');
    expect(rock).toMatchObject({ nome: 'Rock · Boss GT-1000', precoCentavos: 4990, data: '2026-09-10' });
    expect(rock.presets).toHaveLength(3);
  });

  // Edge: a pack with no preset of its style.
  test('um pack sem presets fica com listas vazias e data vazia', async ({ page }) => {
    const resultado = await page.evaluate(async () => {
      const { montarPacks } = await import('/frontend/servicos/catalogo.js');
      return montarPacks([{ id: 'jazz', nome: 'Pack Jazz', descricao: 'x', precoCentavos: 4990 }], []);
    });
    expect(resultado).toEqual([{ id: 'jazz', nome: 'Pack Jazz', descricao: 'x', precoCentavos: 4990, presets: [], data: '' }]);
  });

  // LIST-02: GET /presets starts while GET /packs is still pending.
  test('carregarCatalogo pede /presets sem esperar /packs responder', async ({ page }) => {
    let liberarPacks;
    const packsLiberado = new Promise((r) => { liberarPacks = r; });
    await page.route(`${API}/packs`, async (rota) => { await packsLiberado; await rota.continue(); });
    const pedidoPresets = page.waitForRequest(`${API}/presets`);

    const carregado = page.evaluate(async () => {
      const { carregarCatalogo } = await import('/frontend/servicos/catalogo.js');
      return (await carregarCatalogo()).length;
    });

    await pedidoPresets; // arrives while /packs is held
    liberarPacks();
    expect(await carregado).toBe(9);
  });

  // EDGE-02: one read failing fails the whole catalogue.
  test('carregarCatalogo rejeita quando /presets falha e /packs responde', async ({ page }) => {
    await page.route(`${API}/presets`, (rota) => rota.abort());
    const resultado = await page.evaluate(async () => {
      const { carregarCatalogo } = await import('/frontend/servicos/catalogo.js');
      try { await carregarCatalogo(); return 'resolveu'; } catch { return 'rejeitou'; }
    });
    expect(resultado).toBe('rejeitou');
  });

  // Price format (spec assumption).
  test('formatarPreco usa o formato de moeda brasileiro', async ({ page }) => {
    const texto = await page.evaluate(async () => (await import('/frontend/ui/formato.js')).formatarPreco(4990));
    expect(texto).toBe(formatoBRL(4990));
    expect(texto).toContain('49,90');
    expect(texto).toMatch(/^R\$/);
  });

  // LIST-05 card.
  test('criarCartaoPack mostra nome, quantidade e preço e leva ao pack', async ({ page }) => {
    const cartoes = await page.evaluate(async () => {
      const { montarPacks } = await import('/frontend/servicos/catalogo.js');
      const { criarCartaoPack } = await import('/frontend/ui/cartao.js');
      const [packs, presets] = await Promise.all([
        fetch('http://127.0.0.1:8081/packs').then((r) => r.json()),
        fetch('http://127.0.0.1:8081/presets').then((r) => r.json()),
      ]);
      const umPreset = { id: 'solo', nome: 'Pack Solo', descricao: 'x', precoCentavos: 4990, presets: [{}], data: '' };
      return [...montarPacks(packs, presets), umPreset].map((pack) => {
        const cartao = criarCartaoPack(pack);
        return {
          tag: cartao.tagName,
          href: cartao.getAttribute('href'),
          nome: cartao.querySelector('.cartao-nome')?.textContent,
          quantidade: cartao.querySelector('.cartao-quantidade')?.textContent,
          marcas: cartao.querySelector('.cartao-marcas'),
          preco: cartao.querySelector('.cartao-preco')?.textContent,
        };
      });
    });

    const rock = cartoes.find((c) => c.nome === 'Rock · Boss GT-1000');
    // rev. 2: no brands line; the name already says style and model.
    expect(rock).toEqual({ tag: 'A', href: 'pack.html?id=rock-boss-gt-1000', nome: 'Rock · Boss GT-1000', quantidade: '3 presets', marcas: null, preco: formatoBRL(4990) });
    expect(cartoes.find((c) => c.nome === 'Metal · Boss GT-1000').quantidade).toBe('2 presets');
    expect(cartoes.find((c) => c.nome === 'Pack Solo').quantidade).toBe('1 preset');
  });
});
