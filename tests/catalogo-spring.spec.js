// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa06-front-spring-loja/spec.md: MIG-01, MIG-02 and
// MIG-04. The catalogue pages talk to the real Spring server started by playwright.config.js.

const SPRING = 'http://127.0.0.1:8081';

/** Every request URL the page makes while `acao` runs. */
async function urlsDurante(page, acao) {
  const urls = [];
  page.on('request', (req) => urls.push(req.url()));
  await acao();
  return urls;
}

test.describe('etapa06-front-spring-loja T2 - catalogue from Spring', () => {
  // MIG-01
  for (const [pagina, pronto] of [
    ['index.html', '.carrossel, .cartao'],
    ['packs.html', '.grade-presets .cartao'],
    ['pack.html?id=rock-boss-gt-1000', '.pack-presets li'],
  ]) {
    test(`${pagina} busca o catálogo no Spring e nada na porta 3000`, async ({ page }) => {
      const urls = await urlsDurante(page, async () => {
        await page.goto(pagina);
        await expect(page.locator(pronto).first()).toBeVisible();
      });

      expect(urls.filter((url) => url.includes(':3000'))).toEqual([]);
      expect(urls.some((url) => url.startsWith(`${SPRING}/packs`) || url.startsWith(`${SPRING}/presets`))).toBe(true);
    });
  }

  // MIG-02: the 9 packs and 21 presets of V2__catalogo_inicial.sql.
  test('o Spring serve os 9 packs e 21 presets do catálogo inicial, e a página de packs mostra os 9', async ({ page, request }) => {
    const packs = await (await request.get(`${SPRING}/packs`)).json();
    const presets = await (await request.get(`${SPRING}/presets`)).json();
    expect(packs.map((p) => p.id).sort()).toEqual([
      'blues-boss-gt-1000', 'blues-line6-hx-stomp', 'clean-nux-mg-30', 'clean-zoom-g6', 'metal-boss-gt-1000',
      'metal-nux-mg-30', 'rock-boss-gt-1000', 'rock-line6-hx-stomp', 'rock-zoom-g6',
    ]);
    expect(packs.find((p) => p.id === 'rock-boss-gt-1000').precoCentavos).toBe(4990);
    expect(presets).toHaveLength(21);

    await page.goto('packs.html');
    await expect(page.locator('.grade-presets .cartao')).toHaveCount(9);
  });

  // MIG-04 (the empty-pack case is covered on the server: PresetControllerTest.java:182).
  test('presets de um pack desconhecido voltam como lista vazia, com 200', async ({ request }) => {
    const resposta = await request.get(`${SPRING}/presets?packId=nao-existe`);
    expect(resposta.status()).toBe(200);
    expect(await resposta.json()).toEqual([]);
  });
});
