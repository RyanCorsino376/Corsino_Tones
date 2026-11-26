// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-auth/spec.md: SES-01, SES-04
// (storage half), PROT-03 and EDGE-03. The module is imported in a host page.

const MODULO = '/frontend/servicos/sessao.js';
const CHAVE = 'corsino:sessao';
const USUARIO = { id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com', senha: 'teste123' };
const COM_TOKEN = { ...USUARIO, token: 'eyJ.cabeca.assinatura' };

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
    await page.goto('packs.html');
  });

  // SES-01, revised by etapa06-front-spring-loja (AD-019): the token is kept too, the password never.
  test('abrirSessao guarda id, nome, e-mail e o token, e nunca a senha', async ({ page }) => {
    await chamar(page, 'abrirSessao', COM_TOKEN);
    expect(await lerChave(page)).toBe('{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com","token":"eyJ.cabeca.assinatura"}');
  });

  // AD-019
  test('tokenAtual devolve o token da sessão, e null sem sessão, sem token ou depois de sair', async ({ page }) => {
    expect(await chamar(page, 'tokenAtual')).toBeNull();
    await chamar(page, 'abrirSessao', USUARIO);
    expect(await chamar(page, 'tokenAtual')).toBeNull();
    await chamar(page, 'abrirSessao', COM_TOKEN);
    expect(await chamar(page, 'tokenAtual')).toBe('eyJ.cabeca.assinatura');
    await chamar(page, 'encerrarSessao');
    expect(await chamar(page, 'tokenAtual')).toBeNull();
  });

  // MIG-08: only a 401 from the server means the session expired.
  test('sessaoExpirada só é verdadeira para um ErroApi com status 401', async ({ page }) => {
    const resultado = await page.evaluate(async (modulo) => {
      const { sessaoExpirada } = await import(modulo);
      const { ErroApi } = await import('/frontend/api/cliente.js');
      const casos = [401, 400, 403, 500, 0].map((status) => [status, sessaoExpirada(new ErroApi(status, 'x'))]);
      const naoErroApi = sessaoExpirada(Object.assign(new Error('x'), { status: 401 }));
      return { casos, naoErroApi };
    }, MODULO);
    expect(resultado.casos).toEqual([[401, true], [400, false], [403, false], [500, false], [0, false]]);
    expect(resultado.naoErroApi).toBe(false);
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
  // PROT-03; the pack page with its id is allowed since etapa06-front-spring-loja (MIG-08).
  for (const valido of ['biblioteca.html', 'checkout.html', 'pack.html?id=rock-zoom-g6']) {
    test(`destinoSeguro aceita "${valido}"`, async ({ page }) => {
      expect(await chamar(page, 'destinoSeguro', valido)).toBe(valido);
    });
  }

  // PROT-03
  for (const invalido of [null, '', 'https://evil.example', '//evil.example', '../x.html', 'javascript:alert(1)', 'Biblioteca.html',
    'pack.html?id=../x', 'pack.html?id=a&voltar=//evil.example', 'pack.html?outro=x']) {
    test(`destinoSeguro troca ${JSON.stringify(invalido)} por index.html`, async ({ page }) => {
      expect(await chamar(page, 'destinoSeguro', invalido)).toBe('index.html');
    });
  }
});
