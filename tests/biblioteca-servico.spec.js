// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-biblioteca/spec.md: the orders
// request (LIB-01), ownership (LIB-02), ordering and de-duplication (LIB-04,
// LIB-05), a pack the catalogue lacks (LIB-07) and the pack-page read (OWN-01).
// Modules are imported inside a host page.

const API = 'http://127.0.0.1:3000';
/** A random user id: orders from earlier runs stay in db.json, so a counter would meet them again. */
const novoUsuario = () => 10000000 + Math.floor(Math.random() * 900000000);

const pedidoDe = (usuarioId, packIds, criadoEm, status = 'pago') => ({ usuarioId, packIds, totalCentavos: 0, status, criadoEm });

/** Calls an exported function of servicos/biblioteca.js in the page. */
function chamar(page, nome, ...args) {
  return page.evaluate(async ({ nome, args }) => {
    const modulo = await import('/frontend/servicos/biblioteca.js');
    const valor = await modulo[nome](...args);
    return valor instanceof Set ? [...valor].sort() : valor;
  }, { nome, args });
}

test.describe('etapa05-biblioteca T1 - paid orders and the library service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login.html');
  });

  // LIB-01 (request half)
  test('listarPedidosPagos pede GET /pedidos com o usuário e status=pago e devolve a lista', async ({ page, request }) => {
    const id = novoUsuario();
    await request.post(`${API}/pedidos`, { data: pedidoDe(id, ['rock-boss-gt-1000'], '2026-11-01T10:00:00.000Z') });
    const pedido = page.waitForRequest((req) => req.url().startsWith(`${API}/pedidos`) && req.method() === 'GET');

    const lista = await page.evaluate(async (id) => {
      const { listarPedidosPagos } = await import('/frontend/api/pedidos.js');
      return listarPedidosPagos(id);
    }, id);

    expect((await pedido).url()).toBe(`${API}/pedidos?usuarioId=${id}&status=pago`);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ usuarioId: id, packIds: ['rock-boss-gt-1000'], status: 'pago' });
  });

  // LIB-04, LIB-05
  test('packsDaBiblioteca: pedido mais novo primeiro, packIds na ordem do pedido, pack repetido uma vez', async ({ page }) => {
    const catalogo = ['a', 'b', 'c'].map((id) => ({ id, nome: `Pack ${id}` }));
    const pedidos = [
      { id: 1, criadoEm: '2026-11-01T10:00:00.000Z', packIds: ['a', 'b'] },
      { id: 2, criadoEm: '2026-11-05T10:00:00.000Z', packIds: ['c', 'a'] },
    ];
    const ids = await page.evaluate(async ({ pedidos, catalogo }) => {
      const { packsDaBiblioteca } = await import('/frontend/servicos/biblioteca.js');
      return packsDaBiblioteca(pedidos, catalogo).map((p) => p.id);
    }, { pedidos, catalogo });
    expect(ids).toEqual(['c', 'a', 'b']);
  });

  // LIB-05 (tie-break)
  test('packsDaBiblioteca: com a mesma data vale o pedido de maior id', async ({ page }) => {
    const catalogo = ['a', 'b'].map((id) => ({ id }));
    const pedidos = [
      { id: 3, criadoEm: '2026-11-05T10:00:00.000Z', packIds: ['a'] },
      { id: 9, criadoEm: '2026-11-05T10:00:00.000Z', packIds: ['b'] },
    ];
    const ids = await page.evaluate(async ({ pedidos, catalogo }) => {
      const { packsDaBiblioteca } = await import('/frontend/servicos/biblioteca.js');
      return packsDaBiblioteca(pedidos, catalogo).map((p) => p.id);
    }, { pedidos, catalogo });
    expect(ids).toEqual(['b', 'a']);
  });

  // LIB-07 and the empty case
  test('packsDaBiblioteca: pack fora do catálogo é descartado e sem pedidos devolve lista vazia', async ({ page }) => {
    const resultado = await page.evaluate(async () => {
      const { packsDaBiblioteca } = await import('/frontend/servicos/biblioteca.js');
      const catalogo = [{ id: 'a' }];
      return {
        descartado: packsDaBiblioteca([{ id: 1, criadoEm: '2026-11-01T10:00:00.000Z', packIds: ['fantasma', 'a'] }], catalogo).map((p) => p.id),
        vazio: packsDaBiblioteca([], catalogo),
      };
    });
    expect(resultado.descartado).toEqual(['a']);
    expect(resultado.vazio).toEqual([]);
  });

  // LIB-02, LIB-05 against real mock data
  test('carregarBiblioteca devolve só os packs pagos do usuário, do pedido mais novo ao mais antigo', async ({ page, request }) => {
    const eu = novoUsuario();
    const outro = novoUsuario();
    await request.post(`${API}/pedidos`, { data: pedidoDe(eu, ['rock-boss-gt-1000'], '2026-11-01T10:00:00.000Z') });
    await request.post(`${API}/pedidos`, { data: pedidoDe(eu, ['metal-nux-mg-30', 'rock-boss-gt-1000'], '2026-11-03T10:00:00.000Z') });
    await request.post(`${API}/pedidos`, { data: pedidoDe(eu, ['clean-nux-mg-30'], '2026-11-04T10:00:00.000Z', 'pendente') });
    await request.post(`${API}/pedidos`, { data: pedidoDe(outro, ['blues-line6-hx-stomp'], '2026-11-02T10:00:00.000Z') });

    const packs = await chamar(page, 'carregarBiblioteca', eu);

    expect(packs.map((p) => p.id)).toEqual(['metal-nux-mg-30', 'rock-boss-gt-1000']);
    expect(packs[0].presets.length).toBeGreaterThan(0);
    expect(packs[0]).toMatchObject({ nome: 'Metal · NUX MG-30' });
  });

  // OWN-01 (read)
  test('idsComprados devolve os ids distintos dos packs pagos do usuário', async ({ page, request }) => {
    const eu = novoUsuario();
    await request.post(`${API}/pedidos`, { data: pedidoDe(eu, ['rock-boss-gt-1000', 'metal-nux-mg-30'], '2026-11-01T10:00:00.000Z') });
    await request.post(`${API}/pedidos`, { data: pedidoDe(eu, ['rock-boss-gt-1000'], '2026-11-02T10:00:00.000Z') });
    await request.post(`${API}/pedidos`, { data: pedidoDe(eu, ['clean-nux-mg-30'], '2026-11-03T10:00:00.000Z', 'pendente') });

    expect(await chamar(page, 'idsComprados', eu)).toEqual(['metal-nux-mg-30', 'rock-boss-gt-1000']);
    expect(await chamar(page, 'idsComprados', novoUsuario())).toEqual([]);
  });
});
