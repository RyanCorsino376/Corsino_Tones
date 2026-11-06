// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-api-modulos/spec.md: MOD-01..03.

const FRONTEND = path.join(__dirname, '..', 'frontend');
const GLOBAIS = ['PRESETS', 'ROTULOS', 'criarCartao', 'ordenarMaisRecentes'];

/** Every .js file under frontend/, as paths relative to it ("api/cliente.js"). */
function arquivosJs(pasta = FRONTEND) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) return arquivosJs(caminho);
    return item.name.endsWith('.js') ? [path.relative(FRONTEND, caminho).split(path.sep).join('/')] : [];
  });
}

test.describe('etapa05 T3 - ES modules', () => {
  for (const pagina of ['packs.html', 'index.html']) {
    // MOD-01
    test(`${pagina} carrega todos os scripts como módulo`, async ({ page }) => {
      await page.goto(pagina);
      const tipos = await page.locator('script').evaluateAll((els) => els.map((el) => el.type));
      expect(tipos.length).toBeGreaterThan(0);
      expect(tipos.every((tipo) => tipo === 'module')).toBe(true);
    });

    // MOD-03 (page half): the list still works without any of the old globals.
    test(`${pagina} funciona sem as variáveis globais antigas`, async ({ page }) => {
      await page.goto(pagina);
      await expect(page.locator('.cartao').first()).toBeVisible();
      const definidas = await page.evaluate((nomes) => nomes.filter((nome) => nome in window), GLOBAIS);
      expect(definidas).toEqual([]);
    });
  }

  // MOD-02
  test('só os módulos de frontend/api/ fazem fetch', () => {
    const arquivos = arquivosJs();
    expect(arquivos).toContain('api/cliente.js');
    const comFetch = arquivos.filter((arquivo) =>
      /\bfetch\s*\(/.test(fs.readFileSync(path.join(FRONTEND, arquivo), 'utf8')));
    expect(comFetch.length).toBeGreaterThan(0);
    expect(comFetch.filter((arquivo) => !arquivo.startsWith('api/'))).toEqual([]);
  });

  // MOD-03 (source half)
  test('nenhum arquivo de frontend/ atribui as globais antigas a window', () => {
    const atribuicao = new RegExp(`window\\.(${GLOBAIS.join('|')})\\s*=`);
    const culpados = arquivosJs().filter((arquivo) =>
      atribuicao.test(fs.readFileSync(path.join(FRONTEND, arquivo), 'utf8')));
    expect(culpados).toEqual([]);
  });
});
