// @ts-check
const { test, expect } = require('@playwright/test');

// Tests derive from .specs/features/etapa05-api-modulos/spec.md (API-01).
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
