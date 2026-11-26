// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-checkout/spec.md: CK-* (T2),
// ACC-*, RES-* (T3), FORM-* (T4), PAY-*, PED-*, OK-*, EDGE-01 (T5).

// Since etapa06-front-spring-loja (MIG-05, MIG-08 to MIG-10) everything goes to Spring, and a
// signed-in test uses a real user made by tests/apoio/api.js, because /pedidos needs its token.
const { SPRING, pedidosPagos, registrarUsuario } = require('./apoio/api');
const API = SPRING;
const CHAVE_CARRINHO = 'corsino:carrinho';
const formatoBRL = (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

/**
 * Stores the cart (and, with `sessao`, the session of a newly registered user) before the
 * page under test opens. Resolves with that user's { token, usuario }, or null.
 */
async function preparar(page, { carrinho = [], sessao = false } = {}) {
  await page.goto('login.html');
  const conta = sessao ? await registrarUsuario(page.request) : null;
  await page.evaluate(([chave, valor, sessaoJson]) => {
    localStorage.setItem(chave, valor);
    if (sessaoJson) sessionStorage.setItem('corsino:sessao', sessaoJson);
  }, [CHAVE_CARRINHO, JSON.stringify(carrinho), conta?.sessao ?? null]);
  return conta;
}

const finalizar = (page) => page.getByRole('link', { name: 'Finalizar compra' });

test.describe('etapa05-checkout T2 - Finalizar compra on the cart page', () => {
  // CK-01, CK-02
  test('com packs o carrinho mostra "Finalizar compra"; ao esvaziar, some', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    await page.goto('carrinho.html');
    await expect(finalizar(page)).toBeVisible();
    await expect(finalizar(page)).toHaveAttribute('href', 'checkout.html');

    await page.getByRole('button', { name: 'Remover' }).click();
    await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible();
    await expect(finalizar(page)).toBeHidden();
  });

  // CK-02: not while loading or in error.
  test('enquanto carrega e em erro não há "Finalizar compra"', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${SPRING}/packs`, async (rota) => { await liberado; await rota.abort(); });
    await page.goto('carrinho.html');
    await expect(page.getByRole('status').filter({ hasText: 'Carregando carrinho...' })).toBeVisible();
    // The link exists in the page (inside the hidden list), so "hidden" is not vacuous (lesson L-001).
    await expect(page.locator('a.finalizar')).toHaveCount(1);
    await expect(page.locator('a.finalizar')).toBeHidden();
    liberar();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('a.finalizar')).toBeHidden();
  });
});

const formulario = (page) => page.locator('#form-pagamento');
const dialogo = (page) => page.getByRole('dialog');

/** Packs as the API serves them, by id. */
async function packsPorId(page) {
  const packs = await page.request.get(`${SPRING}/packs`).then((r) => r.json());
  return Object.fromEntries(packs.map((p) => [p.id, p]));
}

// Distinct prices (lesson L-014): the seed prices every pack at 4990, which hides
// where a price or a total comes from.
const PRECOS = { 'rock-zoom-g6': 4990, 'clean-nux-mg-30': 2590 };

/** Serves GET /packs with the PRECOS prices so every pack differs. */
async function precosDistintos(page) {
  await page.route(`${SPRING}/packs`, async (route) => {
    const resposta = await route.fetch();
    const packs = await resposta.json();
    await route.fulfill({
      response: resposta,
      json: packs.map((p) => (PRECOS[p.id] === undefined ? p : { ...p, precoCentavos: PRECOS[p.id] })),
    });
  });
}

test.describe('etapa05-checkout T3 - session required', () => {
  // ACC-01: pop-up, no form, no request, and the page never moves by itself (lessons L-009, L-010).
  test('sem sessão, o checkout abre o pop-up de login, sem formulário nem requisição, e não sai sozinho', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    await page.clock.install();
    const pedidos = [];
    page.on('request', (req) => { if (req.url().startsWith(API)) pedidos.push(req.url()); });
    await page.goto('checkout.html');

    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page)).toContainText('Faça login para finalizar a compra');
    expect(await dialogo(page).evaluate((el) => el.matches(':modal'))).toBe(true);
    await expect(formulario(page)).toHaveCount(1);
    await expect(formulario(page)).toBeHidden();

    await page.clock.runFor(60_000);
    await expect(page).toHaveURL(/\/frontend\/checkout\.html$/);
    expect(await page.locator('meta[http-equiv="refresh" i]').count()).toBe(0);
    expect(pedidos).toEqual([]);
  });

  // ACC-02
  test('"Fazer login" leva a login.html?voltar=checkout.html', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'] });
    await page.goto('checkout.html');
    await dialogo(page).getByRole('button', { name: 'Fazer login' }).click();
    await expect(page).toHaveURL(/\/frontend\/login\.html\?voltar=checkout\.html$/);
  });

  // ACC-03
  for (const [como, agir] of [
    ['"Voltar"', (page) => dialogo(page).getByRole('button', { name: 'Voltar' }).click()],
    ['Esc', (page) => page.keyboard.press('Escape')],
  ]) {
    test(`${como} no pop-up do checkout volta ao carrinho`, async ({ page }) => {
      await preparar(page, { carrinho: ['rock-zoom-g6'] });
      await page.goto('checkout.html');
      await expect(dialogo(page)).toBeVisible();
      await agir(page);
      await expect(page).toHaveURL(/\/frontend\/carrinho\.html$/);
    });
  }

  // ACC-04
  test('depois de entrar pelo pop-up, o checkout abre com o carrinho intacto', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6', 'clean-nux-mg-30'] });
    await page.goto('checkout.html');
    await dialogo(page).getByRole('button', { name: 'Fazer login' }).click();
    await page.locator('#email').fill('ryan@exemplo.com');
    await page.locator('#senha').fill('teste123');
    await page.locator('#form-login button[type="submit"]').click();

    await expect(page).toHaveURL(/\/frontend\/checkout\.html$/);
    await expect(page.locator('.itens-checkout li')).toHaveCount(2);
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6","clean-nux-mg-30"]');
  });
});

test.describe('etapa05-checkout T3 - order summary', () => {
  // RES-01
  test('lista os packs na ordem do carrinho, com preço e total, e mostra o formulário com "Pagar {total}"', async ({ page }) => {
    const porId = await packsPorId(page);
    await precosDistintos(page);
    // Cart order is not alphabetical, so "cart order" differs from a sorted list.
    const carrinho = ['rock-zoom-g6', 'clean-nux-mg-30'];
    await preparar(page, { carrinho, sessao: true });
    const pedido = page.waitForRequest(`${SPRING}/packs`);
    await page.goto('checkout.html');
    await pedido;

    const itens = page.locator('.itens-checkout li');
    await expect(itens).toHaveCount(2);
    for (const [i, id] of carrinho.entries()) {
      await expect(itens.nth(i)).toContainText(porId[id].nome);
      await expect(itens.nth(i).locator('.item-preco')).toHaveText(formatoBRL(PRECOS[id]));
    }
    const total = formatoBRL(PRECOS['rock-zoom-g6'] + PRECOS['clean-nux-mg-30']);
    await expect(page.locator('.checkout-resumo .total-carrinho')).toHaveText(`Total: ${total}`);
    await expect(formulario(page)).toBeVisible();
    await expect(formulario(page).locator('button[type="submit"]')).toHaveText(`Pagar ${total}`);
  });

  // RES-02
  test('com o carrinho vazio mostra o estado vazio, sem formulário nem requisição', async ({ page }) => {
    await preparar(page, { carrinho: [], sessao: true });
    const pedidos = [];
    page.on('request', (req) => { if (req.url().startsWith(API)) pedidos.push(req.url()); });
    await page.goto('checkout.html');
    await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver os packs' })).toHaveAttribute('href', 'packs.html');
    await expect(formulario(page)).toHaveCount(1);
    await expect(formulario(page)).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(pedidos).toEqual([]);
  });

  // RES-03
  test('um pack que não existe mais é tirado do carrinho, com aviso', async ({ page }) => {
    await preparar(page, { carrinho: ['jazz-boss-x', 'rock-zoom-g6'], sessao: true });
    await page.goto('checkout.html');
    await expect(page.getByText('Um pack do seu carrinho não está mais disponível e foi removido.', { exact: true })).toBeVisible();
    await expect(page.locator('.itens-checkout li')).toHaveCount(1);
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6"]');
  });

  // RES-05
  test('enquanto carrega mostra "Carregando carrinho..." e nenhum formulário', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'], sessao: true });
    let liberar;
    const liberado = new Promise((r) => { liberar = r; });
    await page.route(`${SPRING}/packs`, async (rota) => { await liberado; await rota.continue(); });
    await page.goto('checkout.html');
    await expect(page.getByRole('status').filter({ hasText: 'Carregando carrinho...' })).toBeVisible();
    await expect(formulario(page)).toHaveCount(1);
    await expect(formulario(page)).toBeHidden();
    liberar();
    await expect(formulario(page)).toBeVisible();
  });

  // RES-04
  test('falha ao carregar mostra o erro com "Tentar novamente" e nenhum formulário', async ({ page }) => {
    await preparar(page, { carrinho: ['rock-zoom-g6'], sessao: true });
    let tentativas = 0;
    await page.route(`${SPRING}/packs`, (rota) => {
      tentativas += 1;
      return tentativas === 1 ? rota.abort() : rota.continue();
    });
    await page.goto('checkout.html');
    const alerta = page.getByRole('alert');
    await expect(alerta.locator('p')).toHaveText('Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente.');
    await expect(formulario(page)).toBeHidden();
    await alerta.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(formulario(page)).toBeVisible();
  });
});

const CAMPOS = {
  numero: { id: 'cartao-numero', rotulo: 'Número do cartão', msg: 'Informe os 16 dígitos do cartão.' },
  nome: { id: 'cartao-nome', rotulo: 'Nome no cartão', msg: 'Informe o nome como está no cartão.' },
  validade: { id: 'cartao-validade', rotulo: 'Validade (MM/AA)', msg: 'Informe uma validade futura no formato MM/AA.' },
  cvv: { id: 'cartao-cvv', rotulo: 'CVV', msg: 'Informe os 3 dígitos do código de segurança.' },
};

/** Opens a signed-in checkout with one pack and waits for the form. */
async function abrirCheckout(page, carrinho = ['rock-zoom-g6']) {
  const conta = await preparar(page, { carrinho, sessao: true });
  await page.goto('checkout.html');
  await expect(formulario(page)).toBeVisible();
  return conta;
}

async function preencher(page, valores) {
  for (const [campo, valor] of Object.entries(valores)) await page.locator(`#${CAMPOS[campo].id}`).fill(valor);
}

/** Text of the message linked to a field through aria-describedby, or null. */
function mensagemDe(page, id) {
  return page.locator(`#${id}`).evaluate((campo) => {
    const alvo = campo.getAttribute('aria-describedby');
    const el = alvo && document.getElementById(alvo);
    return el ? el.textContent.trim() : null;
  });
}

test.describe('etapa05-checkout T4 - card form validation', () => {
  // FORM-01
  test('o formulário tem os quatro campos com rótulo e o botão "Pagar {total}"', async ({ page }) => {
    const porId = await packsPorId(page);
    await abrirCheckout(page);
    for (const { rotulo } of Object.values(CAMPOS)) await expect(page.getByLabel(rotulo, { exact: true })).toBeVisible();
    await expect(formulario(page).locator('button[type="submit"]')).toHaveText(`Pagar ${formatoBRL(porId['rock-zoom-g6'].precoCentavos)}`);
  });

  // FORM-02..06
  test('dados inválidos mostram as quatro mensagens, ligadas aos campos, com foco no número e sem pagamento', async ({ page }) => {
    await abrirCheckout(page);
    const botao = formulario(page).locator('button[type="submit"]');
    const textoBotao = await botao.textContent();
    await preencher(page, { numero: '4111', nome: 'R', validade: '13/20', cvv: '12' });
    await botao.click();

    for (const { id, msg } of Object.values(CAMPOS)) {
      await expect(page.locator(`#${id}`), id).toHaveAttribute('aria-invalid', 'true');
      expect(await mensagemDe(page, id), id).toBe(msg);
    }
    await expect(page.locator('#cartao-numero')).toBeFocused();
    await expect(botao).toBeEnabled();
    await expect(botao).toHaveText(textoBotao);
  });

  // FORM-06: focus goes to the first rejected field, not simply the first field.
  test('o foco vai ao primeiro campo recusado', async ({ page }) => {
    await abrirCheckout(page);
    await preencher(page, { numero: '4111 1111 1111 1111', nome: 'Ryan', validade: '01/20', cvv: '123' });
    await formulario(page).locator('button[type="submit"]').click();
    await expect(page.locator('#cartao-validade')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cartao-validade')).toBeFocused();
    await expect(page.locator('#cartao-numero')).not.toHaveAttribute('aria-invalid', 'true');
  });

  // FORM-07
  test('corrigir um campo tira só a mensagem dele, sem novo envio', async ({ page }) => {
    await abrirCheckout(page);
    await preencher(page, { numero: '4111', nome: 'R', validade: '13/20', cvv: '12' });
    await formulario(page).locator('button[type="submit"]').click();

    await page.locator('#cartao-numero').fill('4111 1111 1111 1111');

    await expect(page.locator('#cartao-numero')).not.toHaveAttribute('aria-invalid', 'true');
    expect(await mensagemDe(page, 'cartao-numero')).toBeNull();
    await expect(page.locator('#cartao-nome')).toHaveAttribute('aria-invalid', 'true');
  });

  // FORM-06: a second invalid submit does not duplicate messages.
  test('um segundo envio inválido não duplica as mensagens', async ({ page }) => {
    await abrirCheckout(page);
    await preencher(page, { numero: '4111', nome: 'R', validade: '13/20', cvv: '12' });
    await formulario(page).locator('button[type="submit"]').click();
    await formulario(page).locator('button[type="submit"]').click();
    await expect(formulario(page).locator('.erro-campo')).toHaveCount(4);
  });
});

// The holder name differs from the account name, so finding it in storage would mean card data leaked.
const CARTAO_OK = { numero: '4111 1111 1111 1111', nome: 'Titular Teste', validade: '12/39', cvv: '123' };
const CARTAO_RECUSADO = { ...CARTAO_OK, numero: '4111 1111 1111 0000' };
const RECUSADO = 'Pagamento recusado. Verifique os dados do cartão ou use outro cartão.';
const FALHOU = 'Não foi possível concluir a compra. Verifique sua conexão e tente novamente.';

const botaoPagar = (page) => formulario(page).locator('button[type="submit"]');

/** Every request the page sends to the API, as { method, url, body }. */
function gravarRequisicoes(page) {
  const lista = [];
  page.on('request', (req) => {
    if (req.url().startsWith(API)) lista.push({ method: req.method(), url: req.url(), body: req.postData() ?? '' });
  });
  return lista;
}

test.describe('etapa05-checkout T5 - payment, order and confirmation', () => {
  // PAY-01, PAY-02, PED-01, PED-02, OK-01..03, PAY-04, MIG-05, MIG-10. Real catalogue prices: the seed
  // prices every pack at 4990 (lesson L-014 limit), so the total still tells one pack from two.
  test('cartão válido: processa, grava um pedido exato e mostra a confirmação', async ({ page, request }) => {
    const porId = await packsPorId(page);
    // Not alphabetical, so "cart order" differs from a sorted list.
    const carrinho = ['rock-zoom-g6', 'clean-nux-mg-30'];
    const { token, usuario } = await preparar(page, { carrinho, sessao: true });
    await page.goto('checkout.html');
    await expect(formulario(page)).toBeVisible();
    const totalCentavos = carrinho.reduce((s, id) => s + porId[id].precoCentavos, 0);
    await expect(page.locator('.checkout-resumo .total-carrinho')).toHaveText(`Total: ${formatoBRL(totalCentavos)}`);
    const requisicoes = gravarRequisicoes(page);
    const enviado = page.waitForRequest((r) => r.url() === `${API}/pedidos` && r.method() === 'POST');
    const resposta = page.waitForResponse((r) => r.url() === `${API}/pedidos` && r.request().method() === 'POST');

    await preencher(page, CARTAO_OK);
    await botaoPagar(page).click();

    // PAY-02
    await expect(botaoPagar(page)).toBeDisabled();
    await expect(botaoPagar(page)).toHaveText('Processando pagamento...');

    const pedidoCriado = await (await resposta).json();
    const posts = requisicoes.filter((r) => r.method === 'POST');
    expect(posts).toHaveLength(1);
    // MIG-05: only the pack ids, with the session token.
    expect(JSON.parse(posts[0].body)).toEqual({ packIds: carrinho });
    expect((await enviado).headers().authorization).toBe(`Bearer ${token}`);
    // MIG-10: the server stored the total the checkout displayed, for this user.
    expect(pedidoCriado).toMatchObject({ usuarioId: usuario.id, packIds: carrinho, totalCentavos, status: 'pago' });
    expect((await pedidosPagos(request, token)).map((p) => [p.id, p.totalCentavos])).toEqual([[pedidoCriado.id, totalCentavos]]);

    // OK-01
    const confirmacao = page.locator('.checkout-confirmacao');
    await expect(confirmacao.getByRole('heading', { name: 'Compra aprovada!' })).toBeVisible();
    await expect(confirmacao.getByText(/^Pedido nº/)).toHaveText(`Pedido nº ${pedidoCriado.id}`);
    const itensOk = confirmacao.locator('li');
    await expect(itensOk).toHaveCount(2);
    for (const [i, id] of carrinho.entries()) {
      await expect(itensOk.nth(i)).toContainText(porId[id].nome);
      await expect(itensOk.nth(i).locator('.item-preco')).toHaveText(formatoBRL(porId[id].precoCentavos));
    }
    await expect(confirmacao).toContainText(`Total: ${formatoBRL(totalCentavos)}`);
    await expect(confirmacao.getByRole('link', { name: 'Ir para a biblioteca' })).toHaveAttribute('href', 'biblioteca.html');
    await expect(formulario(page)).toBeHidden();
    await expect(page.locator('.checkout-resumo')).toBeHidden();
    // OK-02, OK-03
    await expect(page.locator('.acoes-cabecalho .carrinho-texto')).toHaveText('Carrinho (0)');
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBeNull();

    // PAY-04: no card data in any request or in browser storage.
    const digitos = CARTAO_OK.numero.replace(/ /g, '');
    for (const r of requisicoes) {
      for (const dado of [digitos, CARTAO_OK.numero, CARTAO_OK.nome, CARTAO_OK.validade]) {
        expect(r.url + r.body, `${r.method} ${r.url}`).not.toContain(dado);
      }
      expect(r.body).not.toMatch(/cvv|cartao|numero|validade/i);
    }
    const armazenado = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    for (const dado of [digitos, CARTAO_OK.nome, CARTAO_OK.validade]) expect(armazenado).not.toContain(dado);
  });

  // PAY-03
  test('cartão terminado em 0000 é recusado: avisa, mantém carrinho e dados e não chama a API', async ({ page }) => {
    await abrirCheckout(page);
    const textoBotao = await botaoPagar(page).textContent();
    const requisicoes = gravarRequisicoes(page);

    await preencher(page, CARTAO_RECUSADO);
    await botaoPagar(page).click();

    await expect(formulario(page).getByRole('alert')).toHaveText(RECUSADO);
    expect(requisicoes).toEqual([]);
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6"]');
    await expect(page.locator('#cartao-numero')).toHaveValue(CARTAO_RECUSADO.numero);
    await expect(page.locator('#cartao-cvv')).toHaveValue(CARTAO_RECUSADO.cvv);
    await expect(botaoPagar(page)).toBeEnabled();
    await expect(botaoPagar(page)).toHaveText(textoBotao);
  });

  // PED-03, PED-02
  test('se o pedido falha, avisa, mantém tudo, e tentar de novo cria um único pedido', async ({ page }) => {
    await abrirCheckout(page);
    const textoBotao = await botaoPagar(page).textContent();
    let tentativas = 0;
    await page.route(`${API}/pedidos`, (rota) => {
      tentativas += 1;
      return tentativas === 1 ? rota.abort() : rota.continue();
    });

    await preencher(page, CARTAO_OK);
    await botaoPagar(page).click();

    await expect(formulario(page).getByRole('alert')).toHaveText(FALHOU);
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6"]');
    await expect(page.locator('#cartao-nome')).toHaveValue(CARTAO_OK.nome);
    await expect(botaoPagar(page)).toBeEnabled();
    await expect(botaoPagar(page)).toHaveText(textoBotao);

    await botaoPagar(page).click();
    await expect(page.locator('.checkout-confirmacao').getByRole('heading', { name: 'Compra aprovada!' })).toBeVisible();
    expect(tentativas).toBe(2);
  });

  // MIG-09: the server's packIds message is shown and nothing is lost.
  test('um 400 do servidor com campos.packIds mostra essa mensagem e mantém o carrinho', async ({ page }) => {
    await abrirCheckout(page);
    const mensagem = 'Pack não encontrado: rock-zoom-g6.';
    await page.route(`${API}/pedidos`, (rota) => rota.fulfill({
      status: 400, json: { status: 400, mensagem: 'Dados inválidos.', campos: { packIds: mensagem } },
    }));

    await preencher(page, CARTAO_OK);
    await botaoPagar(page).click();

    await expect(formulario(page).getByRole('alert')).toHaveText(mensagem);
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6"]');
    await expect(botaoPagar(page)).toBeEnabled();
  });

  // MIG-08: an expired token ends the session and asks for a new login, keeping the cart.
  test('um 401 no pedido encerra a sessão e leva ao login com voltar=checkout.html', async ({ page }) => {
    await abrirCheckout(page);
    await page.route(`${API}/pedidos`, (rota) => rota.fulfill({
      status: 401, json: { status: 401, mensagem: 'Faça login para continuar.', campos: {} },
    }));

    await preencher(page, CARTAO_OK);
    await botaoPagar(page).click();

    await expect(page).toHaveURL(/\/frontend\/login\.html\?voltar=checkout\.html$/);
    expect(await page.evaluate(() => sessionStorage.getItem('corsino:sessao'))).toBeNull();
    expect(await page.evaluate((c) => localStorage.getItem(c), CHAVE_CARRINHO)).toBe('["rock-zoom-g6"]');
  });

  // EDGE-01
  test('clique duplo em "Pagar" faz um único pedido', async ({ page }) => {
    await abrirCheckout(page);
    const requisicoes = gravarRequisicoes(page);
    await preencher(page, CARTAO_OK);
    await botaoPagar(page).dblclick();
    await expect(page.locator('.checkout-confirmacao').getByRole('heading', { name: 'Compra aprovada!' })).toBeVisible();
    expect(requisicoes.filter((r) => r.method === 'POST')).toHaveLength(1);
  });

  // OK-04
  test('recarregar depois da confirmação mostra o carrinho vazio e não cria outro pedido', async ({ page }) => {
    await abrirCheckout(page);
    await preencher(page, CARTAO_OK);
    await botaoPagar(page).click();
    await expect(page.locator('.checkout-confirmacao').getByRole('heading', { name: 'Compra aprovada!' })).toBeVisible();

    const requisicoes = gravarRequisicoes(page);
    await page.reload();
    await expect(page.getByText('Seu carrinho está vazio.', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requisicoes.filter((r) => r.method === 'POST')).toEqual([]);
  });
});
