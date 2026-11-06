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

const CAMPOS = ['data', 'descricao', 'equipamento', 'estilo', 'id', 'marca', 'nome'];

const ESPERADO = [
  { id: 1, nome: 'Crunch Clássico', marca: 'boss', equipamento: 'GT-1000', estilo: 'rock', data: '2026-09-10' },
  { id: 2, nome: 'Distorção Moderna', marca: 'nux', equipamento: 'MG-30', estilo: 'metal', data: '2026-08-15' },
  { id: 3, nome: 'Blues de Sexta', marca: 'line6', equipamento: 'HX Stomp', estilo: 'blues', data: '2026-08-28' },
  { id: 4, nome: 'Hard Rock Anos 80', marca: 'boss', equipamento: 'ME-90', estilo: 'rock', data: '2026-04-20' },
  { id: 5, nome: 'Limpo Cristalino', marca: 'mooer', equipamento: 'GE300', estilo: 'clean', data: '2026-07-30' },
  { id: 6, nome: 'Djent Preciso', marca: 'headrush', equipamento: 'MX5', estilo: 'metal', data: '2026-06-25' },
  { id: 7, nome: 'Ápice do Solo', marca: 'zoom', equipamento: 'G6', estilo: 'rock', data: '2026-07-12' },
  { id: 8, nome: 'Funk Limpo', marca: 'hotone', equipamento: 'Ampero II', estilo: 'clean', data: '2026-05-18' },
  { id: 9, nome: 'Texas Blues', marca: 'valeton', equipamento: 'GP-200', estilo: 'blues', data: '2026-06-02' },
];

test.describe('T1 - json-server mock', () => {
  // API-01
  test('GET /presets devolve os 9 presets com os sete campos', async ({ request }) => {
    const resposta = await request.get(`${API}/presets`);
    expect(resposta.status()).toBe(200);

    const presets = await resposta.json();
    expect(Array.isArray(presets)).toBe(true);
    expect(presets).toHaveLength(9);
    for (const preset of presets) {
      expect(Object.keys(preset).sort()).toEqual(CAMPOS);
      expect(typeof preset.descricao).toBe('string');
      expect(preset.descricao.length).toBeGreaterThan(0);
    }
    const semDescricao = presets.map(({ descricao, ...resto }) => resto);
    expect(semDescricao).toEqual(ESPERADO);
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
  test('a semente guarda os 9 presets e o usuário de teste', () => {
    const semente = lerJson(path.join(RAIZ, 'mock', 'db.seed.json'));
    expect(semente.presets.map(({ descricao, ...resto }) => resto)).toEqual(ESPERADO);
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

const IDS_PACKS = ['rock', 'blues', 'metal', 'clean'];

test.describe('etapa05-packs T1 - packs in the mock', () => {
  // PACK-01
  test('GET /packs devolve os 4 packs por estilo, a R$ 49,90 cada', async ({ request }) => {
    const resposta = await request.get(`${API}/packs`);
    expect(resposta.status()).toBe(200);
    const packs = await resposta.json();
    expect(packs.map((p) => p.id)).toEqual(IDS_PACKS);
    for (const pack of packs) {
      expect(Object.keys(pack).sort()).toEqual(['descricao', 'id', 'nome', 'precoCentavos']);
      expect(pack.precoCentavos).toBe(4990);
      expect(pack.nome).toMatch(/^Pack /);
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
