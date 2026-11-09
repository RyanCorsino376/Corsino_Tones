// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-carrinho/spec.md: CAR-01..04 and
// EDGE-03. The module is imported inside a host page.

const MODULO = '/frontend/servicos/carrinho.js';
const CHAVE = 'corsino:carrinho';

/** Runs `funcao(...argumentos)` from the cart module inside the page. */
function chamar(page, funcao, ...argumentos) {
  return page.evaluate(async ({ modulo, funcao, argumentos }) => {
    const carrinho = await import(modulo);
    return carrinho[funcao](...argumentos);
  }, { modulo: MODULO, funcao, argumentos });
}

const lerChave = (page) => page.evaluate((chave) => localStorage.getItem(chave), CHAVE);
const gravarChave = (page, valor) => page.evaluate(([chave, v]) => localStorage.setItem(chave, v), [CHAVE, valor]);

test.describe('etapa05-carrinho T1 - cart service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // CAR-01, CAR-02
  test('adicionar guarda os ids na ordem e não repete um pack', async ({ page }) => {
    await chamar(page, 'adicionarAoCarrinho', 'rock-boss-gt-1000');
    await chamar(page, 'adicionarAoCarrinho', 'rock-boss-gt-1000');
    await chamar(page, 'adicionarAoCarrinho', 'clean-zoom-g6');
    expect(await lerChave(page)).toBe('["rock-boss-gt-1000","clean-zoom-g6"]');
    expect(await chamar(page, 'itensDoCarrinho')).toEqual(['rock-boss-gt-1000', 'clean-zoom-g6']);
  });

  // CAR-01: an empty cart.
  test('sem nada guardado o carrinho está vazio', async ({ page }) => {
    expect(await chamar(page, 'itensDoCarrinho')).toEqual([]);
  });

  test('estaNoCarrinho diz se um pack está ou não no carrinho', async ({ page }) => {
    await chamar(page, 'adicionarAoCarrinho', 'metal-nux-mg-30');
    expect(await chamar(page, 'estaNoCarrinho', 'metal-nux-mg-30')).toBe(true);
    expect(await chamar(page, 'estaNoCarrinho', 'clean-zoom-g6')).toBe(false);
  });

  // CAR-04
  test('remover um pack mantém os outros na ordem', async ({ page }) => {
    for (const id of ['a-1', 'b-2', 'c-3']) await chamar(page, 'adicionarAoCarrinho', id);
    await chamar(page, 'removerDoCarrinho', 'a-1');
    expect(await lerChave(page)).toBe('["b-2","c-3"]');
  });

  // CAR-03
  for (const [caso, valor] of [
    ['JSON inválido', '{nao e json'],
    ['objeto em vez de lista', '{"itens":["a"]}'],
    ['lista com número', '["rock-boss-gt-1000",3]'],
    ['id mal formado', '["rock-boss-gt-1000","../x"]'],
  ]) {
    test(`${caso} conta como carrinho vazio e é apagado`, async ({ page }) => {
      await gravarChave(page, valor);
      expect(await chamar(page, 'itensDoCarrinho')).toEqual([]);
      expect(await lerChave(page)).toBeNull();
    });
  }

  // EDGE-03
  test('um id repetido à mão conta uma vez só', async ({ page }) => {
    await gravarChave(page, '["a-b","a-b","c"]');
    expect(await chamar(page, 'itensDoCarrinho')).toEqual(['a-b', 'c']);
  });

  test('esvaziarCarrinho apaga a chave', async ({ page }) => {
    await chamar(page, 'adicionarAoCarrinho', 'rock-boss-gt-1000');
    await chamar(page, 'esvaziarCarrinho');
    expect(await lerChave(page)).toBeNull();
    expect(await chamar(page, 'itensDoCarrinho')).toEqual([]);
  });
});
