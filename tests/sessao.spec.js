// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-auth/spec.md: SES-01, SES-04
// (storage half), PROT-03 and EDGE-03. The module is imported in a host page.

const MODULO = '/frontend/servicos/sessao.js';
const CHAVE = 'corsino:sessao';
const USUARIO = { id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com', senha: 'teste123' };

/** Runs `funcao(...argumentos)` from the session module inside the page. */
function chamar(page, funcao, ...argumentos) {
  return page.evaluate(async ({ modulo, funcao, argumentos }) => {
    const sessao = await import(modulo);
    return sessao[funcao](...argumentos);
  }, { modulo: MODULO, funcao, argumentos });
}

const lerChave = (page) => page.evaluate((chave) => sessionStorage.getItem(chave), CHAVE);
const gravarChave = (page, valor) => page.evaluate(([chave, v]) => sessionStorage.setItem(chave, v), [CHAVE, valor]);

test.describe('etapa05-auth T3 - session service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('presets.html');
  });

  // SES-01
  test('abrirSessao guarda id, nome e e-mail, e nunca a senha', async ({ page }) => {
    await chamar(page, 'abrirSessao', USUARIO);
    expect(await lerChave(page)).toBe('{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}');
  });

  // SES-01
  test('usuarioAtual devolve a sessão aberta, e null sem sessão', async ({ page }) => {
    expect(await chamar(page, 'usuarioAtual')).toBeNull();
    await chamar(page, 'abrirSessao', USUARIO);
    expect(await chamar(page, 'usuarioAtual')).toEqual({ id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com' });
  });

  // EDGE-03
  for (const [caso, valor] of [['JSON inválido', '{nao e json'], ['JSON sem nome', '{"id":1,"email":"a@b.com"}']]) {
    test(`${caso} conta como sem sessão e é removido`, async ({ page }) => {
      await gravarChave(page, valor);
      expect(await chamar(page, 'usuarioAtual')).toBeNull();
      expect(await lerChave(page)).toBeNull();
    });
  }

  // SES-04 (storage half)
  test('encerrarSessao remove a chave', async ({ page }) => {
    await chamar(page, 'abrirSessao', USUARIO);
    await chamar(page, 'encerrarSessao');
    expect(await lerChave(page)).toBeNull();
    expect(await chamar(page, 'usuarioAtual')).toBeNull();
  });

  // PROT-03
  for (const valido of ['biblioteca.html', 'checkout.html']) {
    test(`destinoSeguro aceita "${valido}"`, async ({ page }) => {
      expect(await chamar(page, 'destinoSeguro', valido)).toBe(valido);
    });
  }

  // PROT-03
  for (const invalido of [null, '', 'https://evil.example', '//evil.example', '../x.html', 'javascript:alert(1)', 'Biblioteca.html']) {
    test(`destinoSeguro troca ${JSON.stringify(invalido)} por index.html`, async ({ page }) => {
      expect(await chamar(page, 'destinoSeguro', invalido)).toBe('index.html');
    });
  }
});
