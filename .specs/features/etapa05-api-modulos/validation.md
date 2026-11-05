# etapa05-api-modulos Validation

**Date**: 2026-11-05
**Spec**: `.specs/features/etapa05-api-modulos/spec.md`
**Diff range**: `191ef06..bf1e7b5` (6 implementation commits: dba6674, f5e830c, 662d77e, 815b6fb, bacf666, bf1e7b5)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 json-server mock | ✅ Done | `mock/db.json`, `npm run api`, `api:lento`; CORS asserted |
| T2 API client | ✅ Done | `frontend/api/cliente.js`, `frontend/api/presets.js` |
| T3 Pages as ES modules | ✅ Done | `dados.js`, `cartao.js`, `presets.js`, `inicio.js` removed; `frontend/paginas/*`, `frontend/ui/*` added |
| T4 Loading state (presets) | ✅ Done | `frontend/ui/estado.js` |
| T5 Error + retry (presets) | ✅ Done | - |
| T6 Loading/error (home) | ✅ Done | - |

---

## Spec-Anchored Acceptance Criteria

### P1: Catalogue served by the mock API

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| API-01 | `GET :3000/presets` → JSON array of 9 with exactly `id,nome,marca,equipamento,estilo,data,descricao` | `tests/api-mock.spec.js:28` `expect(resposta.status()).toBe(200)`; `:32` `toHaveLength(9)`; `:34` `expect(Object.keys(preset).sort()).toEqual(CAMPOS)`; `:39` `expect(semDescricao).toEqual(ESPERADO)`; CORS `:47` | ✅ PASS |
| API-02 | presets.html requests `GET /presets` with Fetch | `tests/presets-lista.spec.js:382` `waitForRequest(req.url() === API_PRESETS && req.method() === 'GET')`; `tests/api-cliente.spec.js:43-45` resolves with ids 1..9; Fetch-only proven by `tests/modulos.spec.js:46` | ✅ PASS (Fetch inferred via MOD-02, `resourceType()` not asserted) |
| API-03 | index.html requests `GET /presets` with Fetch | `tests/presets-lista.spec.js:393` same `waitForRequest` predicate on `index.html` | ✅ PASS (same note) |
| API-04 | Rendered with current filters/search/order; newest first default | `tests/presets-lista.spec.js:388` `expect(await nomesVisiveis(page)).toEqual(esperado.map(p => p.nome))` (newest first); `:410` API-only name drawn; filters/order after load via REG-01 suite; `tests/carga-estado.spec.js:69` (filters during load) | ✅ PASS |
| API-05 | Carousel newest first | `tests/presets-lista.spec.js:400` `expect(nomes).toEqual(esperado.map(p => p.nome))`; `:121` (CAT-04) | ✅ PASS |

### P1: Loading state

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| LOAD-01 | presets.html pending: "Carregando presets..." in `role="status"`, no cards | `tests/carga-estado.spec.js:36` `expect(getByRole('status').filter({hasText: CARREGANDO})).toHaveText(CARREGANDO)`; `:37` `.grade-presets .cartao` `toHaveCount(0)` | ✅ PASS |
| LOAD-02 | index.html pending: "Carregando presets..." in `role="status"` *inside the carousel area* | `tests/carga-estado.spec.js:177` `toHaveText(CARREGANDO)`; `:178` carousel cards `toHaveCount(0)` | ⚠️ Spec-precision gap: "carousel area" undefined; the status locator is page-wide and location is not asserted (impl: `.estado-carga` sibling of `.carrossel`, `frontend/index.html:42`) |
| LOAD-03 | Loading message removed on success or failure | success: `tests/carga-estado.spec.js:51` `avisoCarregando` `toHaveCount(0)`, `:182` (home); failure: `:84` inside `esperarEstadoDeErro` `toHaveCount(0)` | ✅ PASS |
| LOAD-04 | presets.html pending: no count text, no empty-state | `tests/carga-estado.spec.js:38` `#contagem` `toHaveText('')`; `:39` `.lista-vazia` `toBeHidden()` | ✅ PASS |

### P1: Communication error state

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| ERR-01 | Network error → exact message + "Tentar novamente" | `tests/carga-estado.spec.js:89-92` → `:79` `alerta.locator('p')` `toHaveText(MENSAGEM_ERRO)` (exact spec text, `:73`); `:80` button name `Tentar novamente` `toHaveCount(1)`; client: `tests/api-cliente.spec.js:53` `toEqual({ok:false, erroApi:true, status:0})` | ✅ PASS |
| ERR-02 | non-2xx → same | `tests/carga-estado.spec.js:96-99`; `tests/api-cliente.spec.js:61` `status: 500` | ✅ PASS |
| ERR-03 | > 8000 ms → abort + same | `tests/carga-estado.spec.js:119-124` `clock.runFor(7999)` still loading, alert `toHaveCount(0)`; `runFor(2)` → error state; `tests/api-cliente.spec.js:104-108` `'pendente'` at 7999, then `{nome:'ErroApi', status:0}` | ✅ PASS (boundary pinned on both sides) |
| ERR-04 | body not a JSON array → same | `tests/carga-estado.spec.js:103-106` (object body); `tests/api-cliente.spec.js:66-71` (HTML body), `:76-81` (object body) | ✅ PASS |
| ERR-05 | Retry removes error, shows loading, repeats request | `tests/carga-estado.spec.js:143` alert `toHaveCount(0)`; `:144` loading `toHaveText(CARREGANDO)`; `:145` `expect.poll(() => tentativas).toBe(2)`; `:148` 9 cards; home `:199-203` | ✅ PASS |
| ERR-06 | presets.html error: no cards, no count, no empty-state | `tests/carga-estado.spec.js:81-83` cards `0`, `#contagem` `''`, `.lista-vazia` hidden (run for each failure kind) | ✅ PASS |
| ERR-07 | Underlying error written to `console.error` | `tests/api-cliente.spec.js:54,62,72,82,108` `expect.poll(() => erros.length).toBe(1)` (type `error`, prefix `[api]`); success writes none `:46` | ✅ PASS (count asserted; error content not asserted - acceptable, spec says "underlying error" without format) |
| ERR-08 | Error state on both pages | presets: `tests/carga-estado.spec.js:89-125`; home: `:195-197` alert `toHaveCount(1)`, message exact, carousel `0` | ✅ PASS |

### P1: ES modules

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| MOD-01 | Every page script `type="module"` on both pages | `tests/modulos.spec.js:26-27` `expect(tipos.every(t => t === 'module')).toBe(true)` | ✅ PASS |
| MOD-02 | HTTP only from `frontend/api/` | `tests/modulos.spec.js:46` `expect(comFetch.filter(a => !a.startsWith('api/'))).toEqual([])` | ✅ PASS (checks `fetch(`; XHR not scanned - spec's own success criterion is `fetch(`) |
| MOD-03 | No `window.PRESETS/ROTULOS/criarCartao/ordenarMaisRecentes` | runtime `tests/modulos.spec.js:35` `expect(definidas).toEqual([])`; source `:54` `expect(culpados).toEqual([])` | ✅ PASS |
| MOD-04 | login.html flip + validation still work | `tests/login-flip.spec.js` and `tests/login-validacao.spec.js` unchanged in range (`git diff --quiet` ok) and passing, e.g. `tests/login-flip.spec.js:16` `toHaveAttribute('autocomplete','name')`; `login.html`/`login.js` untouched | ✅ PASS |

### P1: Etapa 04 behaviour preserved

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| REG-01 | All etapa04 CAT-02..05, FILT-01..09, EMPTY-01..03, EDGE-01 hold after load | `tests/presets-lista.spec.js`: CAT-02 `:67`, CAT-03 `:79`, CAT-04 `:113`, CAT-05 `:100`, FILT-01 `:142/:151`, FILT-02 `:160`, FILT-03 `:169`, FILT-04 `:180`, FILT-05 `:217/:226/:240`, FILT-06 `:233`, FILT-07 `:281/:289/:298/:307`, FILT-08 `:190/:251`, FILT-09 `:316`, EMPTY-01 `:339/:346/:362`, EMPTY-02 `:353`, EMPTY-03 `:366`, EDGE-01 `:261`; all pass after `abrirLista` waits for `#contagem` `/encontrados?$/` (`:23-26`) | ✅ PASS |
| REG-02 | `[]` → "0 presets encontrados" + empty-state | `tests/presets-lista.spec.js:418` `toHaveText('0 presets encontrados')`; `:419` `getByText('Nenhum preset encontrado')` `toBeVisible()`; `:420` cards `0` | ✅ PASS |

### Edge cases

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| EDGE-01 | Filter changed during load is applied on arrival | `tests/carga-estado.spec.js:61` check Boss while held; `:67` count = Boss count; `:69` `expect(nomes.sort()).toEqual(esperado.sort())` (guard `:65-66` that the filter actually restricts) | ✅ PASS |
| EDGE-02 | Second failure → error state exactly once | `tests/carga-estado.spec.js:165` `tentativas` 2; `:166` `esperarEstadoDeErro` (alert `toHaveCount(1)`); `:167` button `toHaveCount(1)` | ✅ PASS |

**Status**: 24/25 matched spec outcome; 1 ⚠️ spec-precision gap (LOAD-02 location). No uncovered AC.

### Pre-existing test integrity

`git diff 191ef06..bf1e7b5 -- tests/presets-lista.spec.js tests/responsive.spec.js`: every `page.evaluate(() => window.PRESETS)` was replaced by `lerCatalogo()` (Playwright `request` against the API, which itself asserts `resposta.ok()`); `page.goto('presets.html')` became `abrirLista()` (goto + wait for the count). `responsive.spec.js` only adds a wait for the first card in `colunasGrade`. No assertion removed or loosened; 4 tests added. Login specs unchanged.

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt HEAD`, `node_modules` symlinked, runs with `CI=1` (own servers; ports 8080/3000 free before runs). Baseline in scratch: 17/17 pass.

| # | File:line | Mutation | Specs run | Killed? |
| - | --------- | -------- | --------- | ------- |
| M1 | `frontend/api/cliente.js:41` | `if (!resposta.ok) throw` → `if (false) throw` | api-cliente, carga-estado | ✅ Killed (2: 500 client + 500 page) |
| M2 | `frontend/api/cliente.js:9` | `TEMPO_LIMITE_MS = 8000` → `9000` | api-cliente, carga-estado | ✅ Killed (2 timeout tests) |
| M3 | `frontend/api/presets.js:8` | drop `Array.isArray` check | api-cliente, carga-estado | ✅ Killed (2) |
| M4 | `frontend/ui/estado.js:24` | retry button handler → no-op (no re-request) | carga-estado | ✅ Killed (3: ERR-05 presets, EDGE-02, home retry) |
| M5 | `frontend/ui/estado.js:27` | skip `alvo.replaceChildren()` on success (loading stays) | carga-estado | ✅ Killed (3) |
| M6 | `frontend/paginas/presets.js:74` | render without applying filters (`visiveis = catalogo`) | carga-estado | ✅ Killed (EDGE-01) |
| M7 | `frontend/paginas/presets.js:23` | `let catalogo = []` (no render triggered) | carga-estado | ⚪ Invalid - equivalent mutant (no observable change), replaced by M7b |
| M7b | `frontend/paginas/presets.js:23` | `catalogo = []` + render immediately → count/empty-state visible during load and error | carga-estado | ✅ Killed (7: LOAD-04, ERR-06 x4, ERR-05, EDGE-02) |
| M8 | `frontend/api/cliente.js:26` | `console.error` → `console.log` | api-cliente, carga-estado | ✅ Killed (5 ERR-07 tests) |
| M9 | `frontend/paginas/inicio.js:12` | carousel not sorted newest first | carga-estado, presets-lista | ✅ Killed (2: CAT-04, API-05) |
| M10 | `frontend/ui/estado.js:14` | drop `role="status"` on loading | carga-estado | ✅ Killed (6) |
| M11 | `frontend/ui/estado.js:24` | error `append` instead of `replaceChildren` (loading not cleared on failure, messages stack) | carga-estado | ✅ Killed (6 presets error tests; note: the home error test at `tests/carga-estado.spec.js:186` alone does not catch it) |
| M12 | `frontend/index.html:47` | add a classic `<script>` | modulos | ✅ Killed (MOD-01 index) |

**Sensor depth**: expanded (12 valid behavior-level mutants, ≥5 requested).
**Result**: 12/12 valid mutants killed - PASS ✅
**Isolation**: real-tree `git status --porcelain` empty before and after; worktree removed (`git worktree list` shows only the main tree).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (one client, one endpoint wrapper, one generic state helper used by both pages) |
| Surgical changes | ✅ (login files untouched; CSS additions scoped to `.estado-carga`/`.botao-tentar`) |
| No scope creep | ✅ (no POST, no prices, no caching; `ErroApi.status`/`registrarErro` exported for slices 2+ but used here) |
| Matches patterns | ✅ (Portuguese identifiers, English comments, vanilla JS - consistent with repo and AD notes) |
| Spec-anchored outcome check | ✅ (1 spec-precision gap flagged) |
| Per-layer coverage | ✅ (client: every branch of `requisicao`/`listarPresets`; pages: happy + error + edge on both) |
| Every test maps to a requirement | ✅ (each new test carries an ID comment; CORS test maps to API-01 rationale) |
| Documented guidelines followed | ✅ `~/.claude/CLAUDE.md` (English comments, tests with implementation) |

---

## Gate Check

- **Gate command**: `npx playwright test` (Build gate in tasks.md)
- **Result**: 112 passed, 0 failed, 0 skipped (22.9s, 2 workers)
- **Test count before feature**: 83 (`npx playwright test --list` at 191ef06: "Total: 83 tests in 4 files")
- **Test count after feature**: 112
- **Delta**: +29 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Observations (non-blocking)

1. **LOAD-02 location (spec-precision gap)**: `tests/carga-estado.spec.js:177` uses a page-wide `getByRole('status')`. To pin "inside the carousel area", the spec should name the container (e.g. "in the `.estado-carga` element directly above `.carrossel`") and the test should scope the locator to it.
2. **Home error path is lighter than presets**: `tests/carga-estado.spec.js:186-204` covers only the network-error case and does not assert the loading message is gone on failure (M11 escaped this test, though other tests killed it). The shared `carregarComEstado` makes the risk low.
3. **API-02/03 "with the Fetch API"**: request type is not asserted (`req.resourceType() === 'fetch'`); covered indirectly by MOD-02.
4. Environment: after the sensor runs, a `json-server --watch ... --delay 2000` (`npm run api:lento`, started 14:26:45 from the real tree, not by the Verifier) was listening on :3000. Left running.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| API-01..05 | Implementing | ✅ Verified |
| LOAD-01, LOAD-03, LOAD-04 | Implementing | ✅ Verified |
| LOAD-02 | Implementing | ✅ Verified (⚠️ spec-precision gap on "carousel area") |
| ERR-01..08 | Implementing | ✅ Verified |
| MOD-01..04 | Implementing | ✅ Verified |
| REG-01..02 | Implementing | ✅ Verified |
| EDGE-01..02 | Implementing | ✅ Verified |

(Verifier does not edit spec.md; the orchestrator applies this update.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 24/25 ACs matched spec outcome; 1 spec-precision gap (LOAD-02)
**Sensor**: 12/12 valid mutations killed
**Gate**: 112 passed

**What works**: mock API, Fetch client with 8000 ms abort, status/array checks, `console.error` logging, loading/error/retry on both pages, filters applied on arrival, ES modules with no globals, etapa04 behaviour preserved.

**Issues found**: LOAD-02 location not asserted - optionally tighten spec wording and scope the locator to the `.estado-carga` container next to `.carrossel`.

**Next steps**: Orchestrator updates spec.md traceability; optional follow-up for the LOAD-02 wording.
