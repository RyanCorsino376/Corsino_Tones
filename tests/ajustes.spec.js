// @ts-check
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-packs/spec.md: FIX-01..04.

const NOVO_TEXTO = 'Compre uma vez e baixe quando quiser na sua biblioteca';

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
    await page.route('http://127.0.0.1:8081/auth/**', () => {}); // never answers: the button stays pending
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

  // FIX-02 "any button": the registration button too, in its own form (Verifier gap, M22).
  test('o botão "Cadastrando..." também aparece apagado e com cursor de bloqueio', async ({ page }) => {
    await page.route('http://127.0.0.1:8081/auth/**', () => {});
    await page.goto('login.html');
    await page.locator('[data-alvo="cadastro"]').click();
    await page.locator('#cadastro-nome').fill('Ana Teste');
    await page.locator('#cadastro-email').fill('ana.teste@exemplo.com');
    await page.locator('#cadastro-senha').fill('senha1234');
    const botao = page.locator('#form-cadastro button[type="submit"]');
    await botao.click();
    await expect(botao).toBeDisabled();
    const estilo = await botao.evaluate((el) => ({ opacidade: Number(getComputedStyle(el).opacity), cursor: getComputedStyle(el).cursor }));
    expect(estilo.opacidade).toBeLessThan(1);
    expect(estilo.cursor).toBe('not-allowed');
  });

  // FIX-02 "any button": a disabled button outside the login page, created on packs.html.
  test('um botão desativado em outra página também aparece apagado', async ({ page }) => {
    await page.goto('packs.html');
    const estilo = await page.evaluate(() => {
      const botao = document.createElement('button');
      botao.textContent = 'Teste';
      botao.disabled = true;
      document.body.append(botao);
      return { opacidade: Number(getComputedStyle(botao).opacity), cursor: getComputedStyle(botao).cursor };
    });
    expect(estilo.opacidade).toBeLessThan(1);
    expect(estilo.cursor).toBe('not-allowed');
  });

  // FIX-02: an enabled button keeps its normal look.
  test('um botão ativo continua opaco', async ({ page }) => {
    await page.goto('login.html');
    const opacidade = await page.locator('#form-login button[type="submit"]').evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacidade).toBe(1);
  });

  // FIX-03, FIX-04 (rev. 2: a pack is one style for one pedalboard model)
  test('o README descreve a etapa 05 e não cita arquivos removidos', () => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
    expect(readme).toMatch(/etapa 05/i);
    expect(readme).toMatch(/um estilo\s+musical\s+para\s+um\s+único\s+modelo\s+de\s+pedaleira/i);
    expect(readme).not.toMatch(/qualquer equipamento/i);
    for (const trecho of ['npm run api', 'npm run api:lento', 'npm run api:reset', 'ryan@exemplo.com', 'teste123', 'docs/etapa-05.md']) {
      expect(readme, trecho).toContain(trecho);
    }
    for (const removido of ['frontend/login.js', 'preset.html', 'presets.html']) {
      expect(readme, removido).not.toContain(removido);
    }
  });

  // FIX-03: every pack page the README cites must exist (a stale id shows "Pack não encontrado.").
  test('os exemplos de pack.html?id= do README são packs que existem', async ({ request }) => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
    const ids = [...readme.matchAll(/pack\.html\?id=([a-z0-9-]+)/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect((await request.get(`http://127.0.0.1:3000/packs/${id}`)).status(), id).toBe(200);
    }
  });
});
