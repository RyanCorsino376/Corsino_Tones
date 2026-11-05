# Preset Catalogue from a Mock API, as ES Modules - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa05-api-modulos/spec.md`
**Design**: `.specs/features/etapa05-api-modulos/design.md`
**Status**: Draft

### Files removed by this feature

T3 deletes `frontend/dados.js`, `frontend/cartao.js`, `frontend/presets.js` and `frontend/inicio.js`. Their content moves, unchanged in behaviour, to `mock/db.json`, `frontend/ui/` and `frontend/paginas/` (see design, Code Reuse Analysis). Approving these tasks approves those deletions.

### Stage 05 requirement mapping

| Stage 05 item | Covered by |
| ------------- | ---------- |
| Separate the code into modules / no single file | T2, T3 (AD-009 layout) |
| Asynchronous calls with Fetch API | T2 (`requisicao`), T3 (pages call it) |
| Promises / async-await | T2, T4 |
| Loading state | T4, T6 |
| Communication errors | T2 (classification), T5, T6 |
| External or simulated data | T1 (json-server) |
| Query operation | T1-T3 (`GET /presets`) |
| Operation submitted to the server | **Not in this slice** - slice 2 (`POST /usuarios`) |

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: none (no `AGENTS.md`, `CONTRIBUTING.md` or coverage config); strong defaults applied. Style, location and framework follow `tests/*.spec.js` (Playwright, one file per feature, Portuguese test names, criteria IDs in comments).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Mock data and server config (`mock/db.json`, `package.json`, `playwright.config.js`) | e2e | API-01 asserted against the running server | `tests/api-mock.spec.js` | `npx playwright test` |
| API layer (`frontend/api/*.js`) | e2e (module imported in the browser) | Every branch of `requisicao` and `listarPresets`: success, network error, non-2xx, invalid JSON, non-array, timeout, `console.error` | `tests/api-cliente.spec.js` | `npx playwright test` |
| UI helpers and page modules (`frontend/ui/*.js`, `frontend/paginas/*.js`) | e2e | 1:1 to API-02..05, LOAD, ERR, REG, EDGE criteria; happy + error + edge paths on both pages | `tests/presets-lista.spec.js`, `tests/carga-estado.spec.js` | `npx playwright test` |
| Source rules (MOD-01..03) | e2e (Node `fs` + page checks) | Each rule asserted once | `tests/modulos.spec.js` | `npx playwright test` |
| Markup and styles | e2e | Through the behaviour above; `responsive.spec.js` guards layout | `tests/*.spec.js` | `npx playwright test` |

## Gate Check Commands

> Generated from `package.json` (`"test": "playwright test"`) and `playwright.config.js`. No linter or formatter is configured in the repo.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `npx playwright test tests/<file of the task>` |
| Full | Before every commit | `npx playwright test` |
| Build | After the last task | `npx playwright test` (same; no build step exists) |

Baseline before T1: **83 passing** (from `.specs/STATE.md` handoff; re-measured at the start of T1). Every task must end at baseline + its new tests.

---

## Execution Plan

### Phase 1: Data over HTTP

The server, then the code that talks to it. Nothing visible changes yet.

```
T1 -> T2
```

### Phase 2: Pages on modules and the API

Pages switch to the API with no new UI first, so a regression is easy to spot; then loading and error states are added on top.

```
T3 -> T4 -> T5 -> T6
```

---

## Task Breakdown

### T1: json-server mock with the preset catalogue

**What**: Create `mock/db.json` with the 9 presets from `frontend/dados.js`, add `npm run api`, and start json-server as a second Playwright `webServer`.
**Where**: `mock/db.json` (new); also `package.json` (scripts `api`, `api:lento`), `playwright.config.js` (`webServer` array)
**Depends on**: None
**Reuses**: Values of `frontend/dados.js:4-89`; `webServer` pattern of `playwright.config.js:20-31`
**Requirement**: API-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run api` runs `json-server --watch mock/db.json --port 3000 --host 127.0.0.1`; `npm run api:lento` adds `--delay 2000` (for the stage demo)
- [x] `GET http://127.0.0.1:3000/presets` returns 200 and a 9-item array, each item with exactly the seven spec fields, values equal to `dados.js` -> `tests/api-mock.spec.js`
- [x] The response carries `Access-Control-Allow-Origin` (pages on :8080 may call it)
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 83 + new tests pass (no silent deletions)

**Tests**: e2e (`tests/api-mock.spec.js`)
**Gate**: full
**Commit**: `feat(api): serve the preset catalogue from a json-server mock`

**Status**: Complete

Test count: 85 (83 + 2). Playwright starts json-server without `--watch`; tests never write, so the file is never reloaded.

---

### T2: API client module

**What**: Create `requisicao` and `ErroApi` (fetch, 8000 ms timeout, status check, error logging) and `listarPresets` (array check).
**Where**: `frontend/api/cliente.js` (new); also `frontend/api/presets.js` (new, one function)
**Depends on**: T1
**Reuses**: Design, "Components" section
**Requirement**: API-02 (client half), ERR-01..04 (classification), ERR-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `listarPresets()` resolves with the 9 presets from the mock -> `tests/api-cliente.spec.js`
- [x] Rejects with `ErroApi` (`status: 0`) when the route is aborted
- [x] Rejects with `ErroApi` (`status: 500`) on a 500 response
- [x] Rejects with `ErroApi` on a body that is not JSON, and on a JSON object that is not an array
- [x] Rejects with `ErroApi` (`status: 0`) when the route never answers and the clock advances 8001 ms (`page.clock`); does not reject at 7999 ms
- [x] Each rejection above writes one `console.error`; a success writes none
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: T1 total + new tests pass

**Tests**: e2e (`tests/api-cliente.spec.js`, module imported via `page.evaluate`)
**Gate**: full
**Commit**: `feat(api): add a fetch client with timeout and error handling`

**Status**: Complete

Test count: 91 (85 + 6). The timeout test pauses the fake clock (`page.clock.pauseAt`): an installed clock keeps ticking in real time, so `runFor(7999)` alone overshot 8000 ms. Console lines are filtered by the `[api]` prefix because Chromium also logs failed loads as console errors.

---

### T3: Pages load the catalogue from the API as ES modules

**What**: Move the card builder, labels and page scripts into `ui/` and `paginas/` modules, load the catalogue with `listarPresets`, switch both pages to `<script type="module">`, delete the four classic scripts, and make the existing tests read expectations from the API.
**Where**: `frontend/paginas/presets.js` (new); also `frontend/paginas/inicio.js`, `frontend/ui/cartao.js`, `frontend/ui/formato.js` (new, moved code), `frontend/presets.html`, `frontend/index.html`, deleted classic scripts, `tests/presets-lista.spec.js` (helper)
**Depends on**: T2
**Reuses**: `frontend/presets.js:14-79`, `frontend/inicio.js`, `frontend/cartao.js`, `frontend/dados.js:91-107`
**Requirement**: API-02, API-03, API-04, API-05, MOD-01, MOD-02, MOD-03, MOD-04, REG-01, REG-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Both pages issue `GET :3000/presets` on load and render the 9 cards, newest first (`page.waitForRequest`) -> `tests/presets-lista.spec.js`
- [ ] Every `window.PRESETS` read in `tests/presets-lista.spec.js` is replaced by one helper using Playwright's `request` against the API; no assertion is removed or loosened
- [ ] All existing etapa04 tests pass with no other change (REG-01); `tests/login-*.spec.js` unchanged and passing (MOD-04)
- [ ] An empty array from the API (`route.fulfill`) shows "0 presets encontrados" and the empty-state message (REG-02)
- [ ] Every `<script>` on both pages has `type="module"`; `window.PRESETS`, `window.ROTULOS`, `window.criarCartao`, `window.ordenarMaisRecentes` are `undefined` -> `tests/modulos.spec.js`
- [ ] No file under `frontend/` outside `frontend/api/` contains `fetch(`; no file under `frontend/` assigns those four names to `window` -> `tests/modulos.spec.js` (Node `fs`)
- [ ] `frontend/dados.js`, `cartao.js`, `presets.js`, `inicio.js` no longer exist
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T2 total + new tests pass

**Tests**: e2e (`tests/presets-lista.spec.js`, `tests/modulos.spec.js`)
**Gate**: full
**Commit**: `refactor(frontend): load the catalogue from the API through ES modules`

---

### T4: Loading state on the preset list

**What**: Create `carregarComEstado` and use it on `presets.html` to show "Carregando presets..." while the request is pending.
**Where**: `frontend/ui/estado.js` (new); also `frontend/paginas/presets.js`, `frontend/presets.html` (`.estado-carga`), `frontend/style.css`
**Depends on**: T3
**Reuses**: `.lista-vazia` box styles (`frontend/style.css:361-455`)
**Requirement**: LOAD-01, LOAD-03, LOAD-04, EDGE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] With the route held open, a `role="status"` element shows "Carregando presets...", there are 0 cards, `#contagem` is empty and `.lista-vazia` is hidden -> `tests/carga-estado.spec.js`
- [ ] Releasing the route removes the loading text and shows 9 cards
- [ ] Checking "Boss" while the route is held, then releasing, shows only Boss presets (EDGE-01)
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T3 total + new tests pass

**Tests**: e2e (`tests/carga-estado.spec.js`)
**Gate**: full
**Commit**: `feat(presets): show a loading state while the catalogue loads`

---

### T5: Error state and retry on the preset list

**What**: Add the error branch to `carregarComEstado` (message, "Tentar novamente" button that repeats the request) and keep count/empty state hidden while it shows.
**Where**: `frontend/ui/estado.js`; also `frontend/paginas/presets.js`, `frontend/style.css` (button)
**Depends on**: T4
**Reuses**: `carregarComEstado` from T4
**Requirement**: ERR-01, ERR-02, ERR-03, ERR-04, ERR-05, ERR-06, LOAD-03 (failure half), EDGE-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Aborted route, 500 response, non-array body, and a route held past 8000 ms (`page.clock`) each show exactly "Não foi possível carregar os presets. Verifique sua conexão e tente novamente." and a "Tentar novamente" button -> `tests/carga-estado.spec.js`
- [ ] While the error shows: 0 cards, `#contagem` empty, `.lista-vazia` hidden, no loading text
- [ ] First request fails, second succeeds: clicking "Tentar novamente" shows the loading text, sends a second request, then 9 cards
- [ ] Two failures in a row: after the retry, exactly one error message and one button exist
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T4 total + new tests pass

**Tests**: e2e (`tests/carga-estado.spec.js`)
**Gate**: full
**Commit**: `feat(presets): show a retryable error when the catalogue fails to load`

---

### T6: Loading and error states on the home carousel

**What**: Use `carregarComEstado` on `index.html` so the carousel shows the same loading and error states.
**Where**: `frontend/paginas/inicio.js`; also `frontend/index.html` (`.estado-carga`)
**Depends on**: T5
**Reuses**: `carregarComEstado` (T4-T5)
**Requirement**: LOAD-02, ERR-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] With the route held, `index.html` shows "Carregando presets..." in a `role="status"` element and no carousel cards -> `tests/carga-estado.spec.js`
- [ ] With the route aborted, it shows the error message and button; retry with a working route fills the carousel with 9 cards
- [ ] `tests/responsive.spec.js` on `index.html` still passes
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T5 total + new tests pass

**Tests**: e2e (`tests/carga-estado.spec.js`)
**Gate**: full
**Commit**: `feat(home): show loading and error states on the carousel`

---

## Phase Execution Map

```
Phase 1 -> Phase 2

T1 -> T2 -> T3 -> T4 -> T5 -> T6
```

Six tasks fit one task-budgeted batch, so execution runs inline with no batch sub-agents. The Verifier runs automatically after T6.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Data file + two config lines that start it | Granular (cohesive: the server is not runnable or testable without its start commands) |
| T2 | One client function + one endpoint function | Granular |
| T3 | Code move + module switch, no new behaviour | ⚠️ Largest task; kept whole because half-moved code breaks both pages (modules cannot read `window` globals and vice versa) |
| T4 | One helper + one page use | Granular |
| T5 | One branch of the helper | Granular |
| T6 | One page use | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 (phase boundary) | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T4 | T4 -> T5 | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Mock data and server config | e2e | e2e | ✅ OK |
| T2 | API layer | e2e | e2e | ✅ OK |
| T3 | Page modules, UI helpers, source rules | e2e | e2e | ✅ OK |
| T4 | UI helpers, page modules, styles | e2e | e2e | ✅ OK |
| T5 | UI helpers, page modules, styles | e2e | e2e | ✅ OK |
| T6 | Page modules, markup | e2e | e2e | ✅ OK |

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| API-01 | T1 |
| API-02 | T2, T3 |
| API-03, API-04, API-05 | T3 |
| MOD-01, MOD-02, MOD-03, MOD-04 | T3 |
| REG-01, REG-02 | T3 |
| LOAD-01, LOAD-04, EDGE-01 | T4 |
| LOAD-03 | T4, T5 |
| ERR-01, ERR-02, ERR-03, ERR-04 | T2 (client), T5 (screen) |
| ERR-05, ERR-06, EDGE-02 | T5 |
| ERR-07 | T2 |
| LOAD-02, ERR-08 | T6 |

**Coverage:** 25 requirements, 25 mapped to tasks, 0 unmapped.
