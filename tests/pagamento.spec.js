// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-checkout/spec.md: the field rules
// (FORM-02..05, EDGE-02, EDGE-03), the simulated payment (PAY-01, PAY-03) and
// the order request (PED-01). Modules are imported inside a host page.

const { SPRING: API, pedidosPagos, registrarUsuario } = require('./apoio/api');
const MSG = {
  numero: 'Informe os 16 dígitos do cartão.',
  nome: 'Informe o nome como está no cartão.',
  validade: 'Informe uma validade futura no formato MM/AA.',
  cvv: 'Informe os 3 dígitos do código de segurança.',
};

/** validarCampoCartao(campo, valor) in the page, with "today" fixed at 2026-11-15. */
function validar(page, campo, valor) {
  return page.evaluate(async ({ campo, valor }) => {
    const { validarCampoCartao } = await import('/frontend/servicos/pagamento.js');
    return validarCampoCartao(campo, valor, new Date(2026, 10, 15));
  }, { campo, valor });
}

test.describe('etapa05-checkout T1 - card rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // FORM-02, EDGE-03
  test('número: 16 dígitos, com ou sem espaços', async ({ page }) => {
    expect(await validar(page, 'numero', '4111111111111111')).toBe('');
    expect(await validar(page, 'numero', '4111 1111 1111 1111')).toBe('');
    // Anchored rule (lesson L-002): 16 digits once spaces go, but any other character rejects,
    // including inputs that would become 16 digits if every non-digit were stripped.
    for (const ruim of ['411111111111111', '41111111111111111', '4111a11111111111', '4111-1111-1111-1111', '4111111111111111a', '', '    ']) {
      expect(await validar(page, 'numero', ruim), ruim).toBe(MSG.numero);
    }
  });

  // FORM-03
  test('nome: pelo menos 2 caracteres sem contar espaços em volta', async ({ page }) => {
    expect(await validar(page, 'nome', 'Ry')).toBe('');
    for (const ruim of ['', '  ', 'R', ' R ']) {
      expect(await validar(page, 'nome', ruim), JSON.stringify(ruim)).toBe(MSG.nome);
    }
  });

  // FORM-04, EDGE-02
  test('validade: MM/AA, mês válido e não anterior ao mês atual (aceita o mês atual)', async ({ page }) => {
    for (const boa of ['11/26', '12/26', '01/27']) expect(await validar(page, 'validade', boa), boa).toBe('');
    for (const ruim of ['10/26', '13/27', '00/27', '1/27', '11-26', '11/2026', '']) {
      expect(await validar(page, 'validade', ruim), ruim).toBe(MSG.validade);
    }
  });

  // FORM-05
  test('CVV: exatamente 3 dígitos', async ({ page }) => {
    expect(await validar(page, 'cvv', '123')).toBe('');
    for (const ruim of ['12', '1234', '12a', '']) expect(await validar(page, 'cvv', ruim), ruim).toBe(MSG.cvv);
  });
});

test.describe('etapa05-checkout T1 - simulated payment', () => {
  // PAY-01, PAY-03: the decision comes after 1500 ms, by the card rule.
  for (const [numero, esperado] of [
    ['4111 1111 1111 1111', 'aprovado'],
    ['4111 1111 1111 0000', 'PagamentoRecusado'],
    // 0000 elsewhere than at the end does not decline (PAY-03 is "ending in 0000").
    ['4111 0000 1111 1111', 'aprovado'],
    ['0000 1111 1111 1111', 'aprovado'],
  ]) {
    test(`processarPagamento(${numero}) decide "${esperado}" aos 1500 ms, não antes`, async ({ page }) => {
      await page.clock.install({ time: new Date('2026-11-15T10:00:00') });
      await page.clock.pauseAt(new Date('2026-11-15T10:00:01'));
      await page.goto('login.html');
      await page.evaluate(async (n) => {
        const pagamento = await import('/frontend/servicos/pagamento.js');
        window.resultado = 'pendente';
        pagamento.processarPagamento(n).then(
          () => { window.resultado = 'aprovado'; },
          (erro) => { window.resultado = erro instanceof pagamento.PagamentoRecusado ? 'PagamentoRecusado' : String(erro); },
        );
      }, numero);

      await page.clock.runFor(1499);
      expect(await page.evaluate(() => window.resultado)).toBe('pendente');
      await page.clock.runFor(2);
      await expect.poll(() => page.evaluate(() => window.resultado)).toBe(esperado);
    });
  }

  // PAY-04 (service half): the payment never touches the network.
  test('processarPagamento não faz nenhuma requisição', async ({ page }) => {
    await page.goto('login.html');
    const pedidos = [];
    page.on('request', (req) => pedidos.push(req.url()));
    await page.evaluate(async () => {
      const { processarPagamento } = await import('/frontend/servicos/pagamento.js');
      await processarPagamento('4111111111111111');
    });
    expect(pedidos.filter((url) => url.startsWith(API))).toEqual([]);
  });
});

test.describe('etapa05-checkout T1 - orders API', () => {
  // PED-01 (request half), MIG-05: only the pack ids go out, with the session token.
  test('criarPedido envia POST /pedidos em JSON só com packIds e o token, e o pedido passa a existir', async ({ page, request }) => {
    await page.goto('login.html');
    const { token, usuario } = await registrarUsuario(request);
    const enviado = page.waitForRequest((req) => req.url() === `${API}/pedidos` && req.method() === 'POST');

    const criado = await page.evaluate(async (t) => (await import('/frontend/api/pedidos.js')).criarPedido(['rock-zoom-g6'], t), token);

    const req = await enviado;
    expect(req.headers()['content-type']).toBe('application/json');
    expect(req.headers().authorization).toBe(`Bearer ${token}`);
    expect(req.postDataJSON()).toEqual({ packIds: ['rock-zoom-g6'] });
    // The server filled in the rest: owner from the token, price of the catalogue, paid status.
    expect(criado).toMatchObject({ usuarioId: usuario.id, packIds: ['rock-zoom-g6'], totalCentavos: 4990, status: 'pago' });
    expect(typeof criado.id).toBe('number');
    expect((await pedidosPagos(request, token)).map((p) => p.id)).toEqual([criado.id]);
  });
});
