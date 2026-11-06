// @ts-check
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-api-modulos/spec.md (API-01) and
// .specs/features/etapa05-auth/spec.md (DB-01..03).
// The expected catalogue is written out here on purpose: the spec fixes it as
// the nine presets of etapa04, and the source file they came from is removed.

const API = 'http://127.0.0.1:3000';

// Revision 2 of .specs/features/etapa05-packs/spec.md supersedes slice 1's
// "same nine presets": the sample data is nine style + model packs over 21
// presets. The expected packs are written out here because the spec lists them.
const CAMPOS = ['data', 'descricao', 'equipamento', 'estilo', 'id', 'marca', 'nome', 'packId'];

const PACKS_ESPERADOS = [
  { id: 'rock-boss-gt-1000', nome: 'Rock · Boss GT-1000', estilo: 'rock', marca: 'boss', equipamento: 'GT-1000', quantidade: 3 },
  { id: 'metal-boss-gt-1000', nome: 'Metal · Boss GT-1000', estilo: 'metal', marca: 'boss', equipamento: 'GT-1000', quantidade: 2 },
  { id: 'blues-boss-gt-1000', nome: 'Blues · Boss GT-1000', estilo: 'blues', marca: 'boss', equipamento: 'GT-1000', quantidade: 2 },
  { id: 'rock-zoom-g6', nome: 'Rock · Zoom G6', estilo: 'rock', marca: 'zoom', equipamento: 'G6', quantidade: 3 },
  { id: 'clean-zoom-g6', nome: 'Clean · Zoom G6', estilo: 'clean', marca: 'zoom', equipamento: 'G6', quantidade: 2 },
  { id: 'metal-nux-mg-30', nome: 'Metal · NUX MG-30', estilo: 'metal', marca: 'nux', equipamento: 'MG-30', quantidade: 3 },
  { id: 'clean-nux-mg-30', nome: 'Clean · NUX MG-30', estilo: 'clean', marca: 'nux', equipamento: 'MG-30', quantidade: 2 },
  { id: 'blues-line6-hx-stomp', nome: 'Blues · Line 6 HX Stomp', estilo: 'blues', marca: 'line6', equipamento: 'HX Stomp', quantidade: 2 },
  { id: 'rock-line6-hx-stomp', nome: 'Rock · Line 6 HX Stomp', estilo: 'rock', marca: 'line6', equipamento: 'HX Stomp', quantidade: 2 },
];

/** Asserts the 21 presets of revision 2: fields, ids, pack sizes and consistency with the packs (PACK-03, PACK-04). */
function conferirPresets(presets, packs) {
  expect(presets).toHaveLength(21);
  expect(presets.map((p) => p.id).sort((a, b) => a - b)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
  const porId = Object.fromEntries(packs.map((p) => [p.id, p]));
  for (const preset of presets) {
    expect(Object.keys(preset).sort(), preset.nome).toEqual(CAMPOS);
    expect(preset.descricao.length).toBeGreaterThan(0);
    expect(preset.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const pack = porId[preset.packId];
    expect(pack, `${preset.nome} -> ${preset.packId}`).toBeTruthy();
    expect([preset.estilo, preset.marca, preset.equipamento], preset.nome).toEqual([pack.estilo, pack.marca, pack.equipamento]);
  }
  for (const esperado of PACKS_ESPERADOS) {
    expect(presets.filter((p) => p.packId === esperado.id), esperado.id).toHaveLength(esperado.quantidade);
  }
}

test.describe('T1 - json-server mock', () => {
  // API-01 (superseded by etapa05-packs PACK-03/04 rev. 2): the presets the mock serves.
  test('GET /presets devolve os 21 presets, cada um ligado ao seu pack', async ({ request }) => {
    const resposta = await request.get(`${API}/presets`);
    expect(resposta.status()).toBe(200);
    const presets = await resposta.json();
    const packs = await (await request.get(`${API}/packs`)).json();
    conferirPresets(presets, packs);
  });

  // API-01: pages are served from :8080, so the API must allow cross-origin reads.
  test('GET /presets libera acesso de outra origem (CORS)', async ({ request }) => {
    const resposta = await request.get(`${API}/presets`, {
      headers: { Origin: 'http://127.0.0.1:8080' },
    });
    expect(resposta.headers()['access-control-allow-origin']).toMatch(/^(\*|http:\/\/127\.0\.0\.1:8080)$/);
  });
});

const RAIZ = path.join(__dirname, '..');
const USUARIO_SEMENTE = { id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com', senha: 'teste123' };

/** Copies preparar.js and the seed into a fresh temporary folder, so the real db.json is never touched. */
function copiaTemporaria() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'corsino-mock-'));
  for (const arquivo of ['preparar.js', 'db.seed.json']) {
    fs.copyFileSync(path.join(RAIZ, 'mock', arquivo), path.join(pasta, arquivo));
  }
  return pasta;
}

const lerJson = (arquivo) => JSON.parse(fs.readFileSync(arquivo, 'utf8'));

test.describe('etapa05-auth T1 - seed data and reset', () => {
  // DB-01
  test('a semente guarda os 9 packs, os 21 presets e o usuário de teste', () => {
    const semente = lerJson(path.join(RAIZ, 'mock', 'db.seed.json'));
    conferirPresets(semente.presets, semente.packs);
    expect(semente.usuarios).toEqual([USUARIO_SEMENTE]);
  });

  // DB-01
  test('preparar.js cria db.json a partir da semente quando ele não existe', () => {
    const pasta = copiaTemporaria();
    execFileSync('node', [path.join(pasta, 'preparar.js')]);
    expect(lerJson(path.join(pasta, 'db.json'))).toEqual(lerJson(path.join(pasta, 'db.seed.json')));
  });

  // DB-01: an existing working copy keeps the data written to it.
  test('preparar.js não mexe num db.json que já existe', () => {
    const pasta = copiaTemporaria();
    fs.writeFileSync(path.join(pasta, 'db.json'), '{"presets":[],"usuarios":[]}');
    execFileSync('node', [path.join(pasta, 'preparar.js')]);
    expect(lerJson(path.join(pasta, 'db.json'))).toEqual({ presets: [], usuarios: [] });
  });

  // DB-02
  test('preparar.js --reset sobrescreve db.json com a semente', () => {
    const pasta = copiaTemporaria();
    fs.writeFileSync(path.join(pasta, 'db.json'), '{"presets":[],"usuarios":[]}');
    execFileSync('node', [path.join(pasta, 'preparar.js'), '--reset']);
    expect(lerJson(path.join(pasta, 'db.json'))).toEqual(lerJson(path.join(pasta, 'db.seed.json')));
  });

  // DB-02
  test('npm run api:reset chama preparar.js --reset', () => {
    const pacote = lerJson(path.join(RAIZ, 'package.json'));
    expect(pacote.scripts['api:reset']).toBe('node mock/preparar.js --reset');
    expect(pacote.scripts.api).toMatch(/^node mock\/preparar\.js && json-server /);
  });

  // DB-03
  test('mock/db.json fica fora do controle de versão', () => {
    expect(() => execFileSync('git', ['check-ignore', '-q', 'mock/db.json'], { cwd: RAIZ })).not.toThrow();
    expect(execFileSync('git', ['ls-files', 'mock/db.json'], { cwd: RAIZ }).toString()).toBe('');
  });

  // DB-01: the running mock serves the seed user.
  test('GET /usuarios?email= devolve o usuário da semente', async ({ request }) => {
    const resposta = await request.get(`${API}/usuarios?email=ryan@exemplo.com`);
    expect(resposta.status()).toBe(200);
    expect(await resposta.json()).toEqual([USUARIO_SEMENTE]);
  });
});

const IDS_PACKS = PACKS_ESPERADOS.map((p) => p.id);

test.describe('etapa05-packs T1 - packs in the mock', () => {
  // PACK-01
  test('GET /packs devolve os 9 packs de estilo + modelo, a R$ 49,90 cada', async ({ request }) => {
    const resposta = await request.get(`${API}/packs`);
    expect(resposta.status()).toBe(200);
    const packs = await resposta.json();
    expect(packs.map((p) => p.id)).toEqual(IDS_PACKS);
    for (const [i, pack] of packs.entries()) {
      expect(Object.keys(pack).sort()).toEqual(['descricao', 'equipamento', 'estilo', 'id', 'marca', 'nome', 'precoCentavos']);
      const { quantidade, ...esperado } = PACKS_ESPERADOS[i];
      expect(pack).toMatchObject(esperado);
      expect(pack.precoCentavos).toBe(4990);
      expect(pack.descricao.length).toBeGreaterThan(0);
    }
  });

  // PACK-02
  test('GET /packs/{id} devolve cada pack e 404 para um id desconhecido', async ({ request }) => {
    for (const id of IDS_PACKS) {
      const resposta = await request.get(`${API}/packs/${id}`);
      expect(resposta.status(), id).toBe(200);
      expect((await resposta.json()).id).toBe(id);
    }
    expect((await request.get(`${API}/packs/jazz`)).status()).toBe(404);
  });

  // PACK-03: the existing API-01 test above still asserts the seven preset fields; the seed agrees.
  test('os presets da semente continuam sem preço', () => {
    const semente = lerJson(path.join(RAIZ, 'mock', 'db.seed.json'));
    for (const preset of semente.presets) expect(preset).not.toHaveProperty('precoCentavos');
  });
});
