// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-packs/spec.md: FIX-01..04.

const NOVO_TEXTO = 'Packs de presets por estilo: compre uma vez e baixe quando quiser na sua biblioteca';

test.describe('etapa05-packs T7 - leftovers from slice 2', () => {
  // FIX-01
  test('a página inicial mostra o novo texto e não fala em download gratuito', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.getByText(NOVO_TEXTO, { exact: true })).toBeVisible();
    expect(await page.locator('body').textContent()).not.toMatch(/download gratuito/i);
    const descricao = await page.locator('meta[name="description"]').getAttribute('content');
    expect(descricao).not.toMatch(/download gratuito/i);
  });

  // FIX-02
  test('um botão desativado aparece apagado e com cursor de bloqueio', async ({ page }) => {
    await page.route('http://127.0.0.1:3000/usuarios**', () => {}); // never answers: the button stays pending
    await page.goto('login.html');
    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    const botao = page.locator('#form-login button[type="submit"]');
    await botao.click();
    await expect(botao).toBeDisabled();

    const estilo = await botao.evaluate((el) => ({ opacidade: Number(getComputedStyle(el).opacity), cursor: getComputedStyle(el).cursor }));
    expect(estilo.opacidade).toBeLessThan(1);
    expect(estilo.cursor).toBe('not-allowed');
  });

  // FIX-02: an enabled button keeps its normal look.
  test('um botão ativo continua opaco', async ({ page }) => {
    await page.goto('login.html');
    const opacidade = await page.locator('#form-login button[type="submit"]').evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacidade).toBe(1);
  });

  // FIX-03, FIX-04
  test('o README descreve a etapa 05 e não cita arquivos removidos', () => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
    expect(readme).toMatch(/etapa 05/i);
    expect(readme).toMatch(/pack/i);
    for (const trecho of ['npm run api', 'npm run api:lento', 'npm run api:reset', 'ryan@exemplo.com', 'teste123', 'docs/etapa-05.md']) {
      expect(readme, trecho).toContain(trecho);
    }
    for (const removido of ['frontend/login.js', 'preset.html', 'presets.html']) {
      expect(readme, removido).not.toContain(removido);
    }
  });
});
