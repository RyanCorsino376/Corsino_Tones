# Style Packs Replace Preset Cards - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa05-packs/spec.md`
**Design**: `.specs/features/etapa05-packs/design.md`
**Status**: Done (pending Verifier)

### Files renamed, removed or rewritten

Approving these tasks approves all of them:

- T3: `frontend/presets.html` → `frontend/packs.html`, `frontend/paginas/presets.js` → `frontend/paginas/packs.js`, `tests/presets-lista.spec.js` → `tests/packs-lista.spec.js` (all `git mv`, then edited). The preset card builder `criarCartao` is removed.
- T6: `frontend/preset.html` and `frontend/paginas/preset.js` are deleted.
- The list tests are **rewritten for packs** (T3). The table in T3 maps every old test to its replacement; none is dropped without one.

### Verifier speed (from slice 2)

The Verifier runs each mutant against the spec files that cover the mutated module only, then the full suite once at the end.

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: none; strong defaults applied. Style follows `tests/*.spec.js` (Playwright, Portuguese test names, requirement IDs in comments; module tests import the module inside a page).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Mock data (`mock/db.seed.json`) | e2e (API request) | PACK-01..03 each asserted | `tests/api-mock.spec.js` | `npx playwright test` |
| API layer (`frontend/api/packs.js`, `presets.js`) | e2e (module in page) | Success, 404 → null, non-list, network error | `tests/api-packs.spec.js` | `npx playwright test` |
| Services (`frontend/servicos/catalogo.js`) and formatting | e2e (module in page) | Join fields, empty pack, one read failing, price format | `tests/catalogo.spec.js` | `npx playwright test` |
| Pages (`frontend/paginas/*.js`, HTML) | e2e | 1:1 to LIST, HOME, PAG, REM, FIX, EDGE criteria; happy + edge + error | `tests/packs-lista.spec.js`, `tests/carga-estado.spec.js`, `tests/pack-pagina.spec.js`, `tests/cabecalho.spec.js`, `tests/ajustes.spec.js` | `npx playwright test` |
| Markup and styles | e2e | Through the behaviour above; `responsive.spec.js` guards layout | `tests/*.spec.js` | `npx playwright test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `npx playwright test tests/<files of the task>` |
| Full | Before every commit | `npx playwright test` |
| Build | After the last task | `npx playwright test` |

Baseline before T1: **180 passing**.

---

## Execution Plan

### Phase 1: Data

```
T1 -> T2
```

### Phase 2: Pages

```
T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10
```

T8-T10 implement revision 2 of the spec (a pack is one style for one pedalboard model), requested by the user after T7.

---

## Task Breakdown

### T1: Packs in the mock API and API module

**What**: Add the four packs to the seed and create `listarPacks`, `buscarPack` and `listarPresetsDoEstilo`.
**Where**: `frontend/api/packs.js` (new); also `mock/db.seed.json`, `frontend/api/presets.js`
**Depends on**: None
**Reuses**: `requisicao`, `ErroApi`, `registrarErro`; pattern of `api/usuarios.js`
**Requirement**: PACK-01, PACK-02, PACK-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `GET /packs` returns ids `rock`, `blues`, `metal`, `clean`, each with `nome`, `descricao`, `precoCentavos: 4990` -> `tests/api-mock.spec.js`
- [x] `GET /packs/rock` returns the Rock pack; `GET /packs/jazz` returns 404
- [x] Presets keep exactly the seven fields of slice 1 (existing API-01 test unchanged)
- [x] `buscarPack('metal')` resolves with the pack; `buscarPack('jazz')` resolves `null`; an aborted route rejects with `ErroApi` -> `tests/api-packs.spec.js`
- [x] `listarPacks()` resolves the 4 packs; a non-list body rejects with `ErroApi`
- [x] `listarPresetsDoEstilo('rock')` sends `GET /presets?estilo=rock` and resolves the 3 rock presets
- [x] `npm run api:reset` is needed once for an existing `mock/db.json` to get the packs (noted in the task status)
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 180 + new tests pass

**Tests**: e2e (`tests/api-mock.spec.js`, `tests/api-packs.spec.js`)
**Gate**: full
**Commit**: `feat(api): add style packs to the mock and the API layer`

**Status**: Complete

Test count: 189 (180 + 9). Run `npm run api:reset` once on an existing checkout: `mock/db.json` is created from the seed only when missing, so an old copy has no packs.

---

### T2: Catalogue join, pack card and price format

**What**: Create `montarPacks` / `carregarCatalogo`, `formatarPreco` and `criarCartaoPack`.
**Where**: `frontend/servicos/catalogo.js` (new); also `frontend/ui/formato.js`, `frontend/ui/cartao.js`
**Depends on**: T1
**Reuses**: `listarPresets`, `listarPacks`; `ROTULOS`; `.cartao*` classes
**Requirement**: LIST-05 (card content), LIST-02 (parallel reads), EDGE-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `montarPacks` on the seed gives for `rock`: 3 presets, `marcas` = `['boss', 'zoom']` (any order), `data` = `'2026-09-10'`; for `metal`: 2 presets -> `tests/catalogo.spec.js`
- [x] A pack with no preset gets `presets: []`, `marcas: []`, `data: ''`
- [x] `carregarCatalogo` starts `GET /presets` before `GET /packs` answers (route on `/packs` held; `/presets` request observed while held)
- [x] `carregarCatalogo` rejects when `/presets` is aborted while `/packs` succeeds (EDGE-02)
- [x] `formatarPreco(4990)` equals `new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(49.9)` and contains "49,90"
- [x] `criarCartaoPack(rock view)` is an `<a>` to `pack.html?id=rock` showing "Pack Rock", "3 presets", "Boss, Zoom" and the formatted price; a 1-preset pack shows "1 preset"
- [x] The current pages keep working (T3 and T4 switch them); full gate passes
- [x] Test count: T1 total + new tests pass

**Tests**: e2e (`tests/catalogo.spec.js`)
**Gate**: full
**Commit**: `feat(catalog): join packs with their presets and build pack cards`

**Status**: Complete

Test count: 195 (189 + 6). Deviation: the preset card `criarCartao` stays until T4, when the home carousel (its last user) switches to packs; removing it here would break the pages before T3/T4.

---

### T3: Packs page with filters, search and sort

**What**: Rename the presets page to `packs.html`, list pack cards from `carregarCatalogo`, apply the pack rules for brand, style, search and sort, update count and empty-state texts, change the menu on every page, and rewrite the list tests for packs.
**Where**: `frontend/paginas/packs.js` (renamed from `presets.js`); also `frontend/packs.html` (renamed), the menu in `index.html`, `preset.html`, `biblioteca.html`, `login.html`, `tests/packs-lista.spec.js` (renamed, rewritten), `tests/carga-estado.spec.js`, `tests/modulos.spec.js`, `tests/responsive.spec.js`, `tests/cabecalho.spec.js` (page names)
**Depends on**: T2
**Reuses**: The whole pipeline of `paginas/presets.js`; `carregarComEstado`; `criarCartaoPack`
**Requirement**: LIST-01 .. LIST-12, EDGE-03, REG-02 (list page half)

**Tools**:

- MCP: NONE
- Skill: NONE

**Old list test → replacement** (`presets-lista.spec.js` → `packs-lista.spec.js`):

| Old (presets) | New (packs) |
| ------------- | ----------- |
| CAT-01 catalogue shape, brands/styles covered | API data covered by T1; new: every brand checkbox matches at least one pack, every style one pack |
| CAT-02/03 one card per preset, content, link | LIST-05: one card per pack, newest first; content (name, count, brands, price) and link |
| CAT-04 carousel | moves to T4 (HOME-01) |
| CAT-05 noscript | kept on `packs.html` |
| FILT-01..04 brand/style OR/AND | LIST-06 on packs (Boss → Rock only; NUX+Hotone → Metal+Clean; Boss AND metal → none) |
| FILT-05/06 search, spaces | LIST-07 (pack name, pack description, preset name inside: "djent" → Metal; accent: "apice" → Rock) |
| FILT-07 order | LIST-08 (three orders, each different on the seed) |
| FILT-08/09 Aplicar, Limpar, Enter | LIST-09 |
| EMPTY-01..03 count, empty, recover | LIST-10, LIST-11 |
| EDGE-01 regex chars | LIST-07 literal text |
| (slice 1) etapa05 T3 API-02/04/REG-02 | LIST-02, LIST-05; empty `/packs` → "0 packs encontrados" + empty state |

**Done when**:

- [x] Every row of the table above has its replacement test in `tests/packs-lista.spec.js`, each asserting the spec value
- [x] Menu on every page is "Página Inicial · Packs · Biblioteca"; `aria-current` on Packs in `packs.html`
- [x] `tests/carga-estado.spec.js` list tests use `packs.html`, "Carregando packs...", the new error text and 4 cards; one-of-two-reads failing shows the error (EDGE-02 at page level)
- [x] No preset card exists on `packs.html` (LIST-12: no element shows a preset `equipamento` as a card)
- [x] `tests/modulos.spec.js`, `tests/responsive.spec.js`, `tests/cabecalho.spec.js` use `packs.html` instead of `presets.html`
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count reported (old 31 list tests replaced; net change explained in the status)

**Tests**: e2e
**Gate**: full
**Commit**: `feat(packs): turn the presets page into a packs page with the same filters`

**Status**: Complete

Test count: 201 (195 + 6 net). `presets-lista.spec.js` (35 tests: 31 etapa04 + 4 slice 1) became `packs-lista.spec.js` (37 tests) following the mapping table; correction (written during T4): the carousel tests (etapa04 CAT-04, slice 1 API-03/05) were not carried into the new file, so between T3 and T4 the carousel was covered only by the loading/error tests in `carga-estado.spec.js`; T4 adds the HOME tests. One expectation was wrong in the first draft: "DISTORCAO" also matches the Rock pack (a rock preset description says "Distorção"); the test now derives the expected packs from the API with the spec rule. Loading/error tests keep holding or breaking `/presets`, which `packs.html` also reads, and gained a `/packs`-failure test (LIST-03 "either"). Card texts got their own styles after a screenshot showed default paragraph margins.

---

### T4: Packs on the home carousel

**What**: Make the home carousel load the catalogue and show pack cards, titled "Packs", with the new loading and error texts.
**Where**: `frontend/paginas/inicio.js`; also `frontend/index.html`, `tests/carga-estado.spec.js` (home tests), `tests/packs-lista.spec.js` (HOME block)
**Depends on**: T3
**Reuses**: `carregarCatalogo`, `criarCartaoPack`, `ordenarMaisRecentes`
**Requirement**: HOME-01, HOME-02, HOME-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Carousel titled "Packs" shows 4 pack cards, newest first, each linking to its pack -> `tests/packs-lista.spec.js`
- [x] No preset card on `index.html`
- [x] Home loading and error tests use "Carregando packs..." and the new error text -> `tests/carga-estado.spec.js`
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(home): show the packs in the home carousel`

**Status**: Complete

Test count: 203 (201 + 2). The home loading/error tests now use the packs texts and 4 cards. The preset card builder `criarCartao` is removed here, as planned in T2's note: the carousel was its last user.

---

### T5: Pack page

**What**: Create `pack.html` and `paginas/pack.js`: id validation, parallel reads, info block and preset list, title, not-found, loading and error.
**Where**: `frontend/paginas/pack.js` (new); also `frontend/pack.html` (new, top block copied from `preset.html`), `frontend/style.css`, `tests/pack-pagina.spec.js` (new)
**Depends on**: T4
**Reuses**: `.preset-topo` layout, `carregarComEstado`, `atualizarCabecalho`, `formatarPreco`, `ROTULOS`
**Requirement**: PAG-01 .. PAG-09, EDGE-01, EDGE-02 (pack page)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pack.html?id=metal` requests `GET /packs/metal` and `GET /presets?estilo=metal`; shows `<h1>` "Pack Metal", its description, the formatted price, "2 presets", and a list with "Distorção Moderna" (NUX · MG-30) and "Djent Preciso" (HeadRush · MX5) with descriptions -> `tests/pack-pagina.spec.js`
- [x] Title "Pack Metal | CorsinoTones"
- [x] No download link on the page
- [x] No `id`, `Rock`, `rock1`, `../x`: "Pack não encontrado." + "Ver todos os packs" → `packs.html`, and no request to the API
- [x] `jazz` (404): same not-found message
- [x] Aborted route: error text + "Tentar novamente"; retry with a working route shows the pack
- [x] While held: "Carregando pack..." and the info block hidden; while not-found or error: info block hidden
- [x] Signed in: header shows "Olá, Ryan" on the pack page
- [x] Full gate passes; test count reported

**Tests**: e2e (`tests/pack-pagina.spec.js`)
**Gate**: full
**Commit**: `feat(pack): add a page per pack with its price and presets`

**Status**: Complete

Test count: 217 (203 + 14). The info block and the preset list start `hidden`; `.preset-topo[hidden]` restores `display: none`, which the grid rule would otherwise override. Six malformed ids are tested, including a missing `id` parameter.

---

### T6: Remove the single-preset page

**What**: Delete `preset.html` and `paginas/preset.js`, remove `.preset-download` CSS, and point responsive and header tests to `pack.html?id=rock`.
**Where**: `frontend/preset.html` (deleted); also `frontend/paginas/preset.js` (deleted), `frontend/style.css`, `tests/responsive.spec.js`, `tests/cabecalho.spec.js`, `tests/modulos.spec.js`
**Depends on**: T5
**Reuses**: -
**Requirement**: REM-01, REM-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `frontend/preset.html`, `frontend/paginas/preset.js` and `frontend/presets.html` do not exist; no file under `frontend/` contains `preset.html` or `presets.html` -> `tests/modulos.spec.js` (Node `fs`)
- [x] Responsive top-block tests open `pack.html?id=rock` and wait for the pack before measuring; overflow test lists `packs.html` and `pack.html?id=rock`
- [x] Header tests list `packs.html` and `pack.html?id=rock`
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `refactor(frontend): remove the single-preset page`

**Status**: Complete

Test count: 219 (217 + 2). Also removed the video styles (`.preset-video`, `.grade-videos`), orphaned by deleting the page. The overflow test's URL check now escapes every regex character (`?` in `pack.html?id=rock`), and the column helper waits for the pack block, which is hidden until load.

---

### T7: Home text, disabled buttons and README

**What**: Replace the free-download text and meta description, style disabled buttons, rewrite the README for stage 05.
**Where**: `README.md`; also `frontend/index.html`, `frontend/style.css`, `tests/ajustes.spec.js` (new)
**Depends on**: T6
**Reuses**: `.loginBt` button styles
**Requirement**: FIX-01, FIX-02, FIX-03, FIX-04, REG-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `index.html` shows the new sentence and neither its body nor its meta description contains "download gratuito" -> `tests/ajustes.spec.js`
- [x] While the login request is held, the "Entrando..." button has computed `opacity` < 1 and `cursor` `not-allowed`
- [x] README contains "etapa 05", "npm run api", "npm run api:lento", "npm run api:reset", "ryan@exemplo.com", "teste123", a link to `docs/etapa-05.md`, and none of `frontend/login.js`, `preset.html`, `presets.html` (Node `fs`)
- [x] All `etapa05-auth` tests pass (REG-01)
- [x] Full gate passes; test count reported

**Tests**: e2e (`tests/ajustes.spec.js`)
**Gate**: full
**Commit**: `fix(site): update home text, disabled buttons and README`

**Status**: Complete

Test count: 223 (219 + 4). "Um botão ativo continua opaco" passes before the fix by design: it guards against a rule that fades every button. The README keeps the React migration as a next step (decided earlier: after the store).

---

### T8: Style + model packs in the data and the API (revision 2)

**What**: Replace the sample data with nine style + model packs (21 presets, each with `packId`) and replace `listarPresetsDoEstilo` with `listarPresetsDoPack`.
**Where**: `mock/db.seed.json`; also `frontend/api/presets.js`, `tests/api-mock.spec.js`, `tests/api-packs.spec.js`
**Depends on**: T7
**Reuses**: The kept presets of Boss GT-1000, Zoom G6, NUX MG-30 and Line 6 HX Stomp
**Requirement**: PACK-01, PACK-02, PACK-03, PACK-04 (rev. 2)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `GET /packs` returns the nine packs of the spec's sample-data row, each with the seven fields and `precoCentavos: 4990`; ids follow `{estilo}-{marca}-{equipamento}` -> `tests/api-mock.spec.js`
- [x] `GET /presets` returns 21 presets, each with a `packId` of an existing pack and the same `estilo`, `marca`, `equipamento` as that pack; pack sizes are 3, 2, 2, 3, 2, 3, 2, 2, 2 as listed
- [x] `listarPresetsDoPack('rock-boss-gt-1000')` sends `GET /presets?packId=rock-boss-gt-1000` and resolves its 3 presets -> `tests/api-packs.spec.js`
- [x] Slice 1 API-01 test (nine fixed presets) is rewritten to the new data (superseded, spec "Slice 1 tests" row)
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): make each pack one style for one pedalboard model`

**Status**: Complete

Deviation: T8, T9 and T10 were done as one commit. Changing the data shape (pack ids, `packId`) breaks the join, the filters and the pack page at the same time, so no single task could end with a green suite; splitting them would have needed throw-away compatibility code. Test count after the three: 227 (223 + 4 net).

---

### T9: Packs page and cards for style + model packs (revision 2)

**What**: Join packs and presets by `packId`, drop the brands line from the card, filter brand by `pack.marca` and style by `pack.estilo`, search also in `pack.equipamento`, and keep only the four brands in the filter.
**Where**: `frontend/servicos/catalogo.js`; also `frontend/ui/cartao.js`, `frontend/paginas/packs.js`, `frontend/packs.html`, `tests/catalogo.spec.js`, `tests/packs-lista.spec.js`, `tests/carga-estado.spec.js`
**Depends on**: T8
**Reuses**: The T3 pipeline
**Requirement**: LIST-05, LIST-06, LIST-07, LIST-13 (rev. 2); LIST-* and HOME-* re-checked on the new data

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cards show name, "{N} presets" and price, no brands line -> `tests/catalogo.spec.js`, `tests/packs-lista.spec.js`
- [x] Brand filter offers exactly Boss, Line 6, NUX, Zoom; "Zoom" shows the two Zoom G6 packs; Zoom + Line 6 shows four; Zoom AND metal shows none
- [x] Search "g6" shows the two Zoom G6 packs; a preset name finds its pack
- [x] Every list, sort, count and home test passes on the nine packs, with expected values derived from the API
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(packs): filter and show packs by style and model`

**Status**: Complete

Done in the T8 commit (see T8). The brands line and its `.cartao-marcas` style were removed. Search terms in the tests are derived from the API with the spec rule ("distorcao" matches three packs through preset names and descriptions).

---

### T10: Pack page for style + model packs (revision 2)

**What**: Accept dashed ids, read the pack and `GET /presets?packId=` in parallel, and point the page tests to the new ids.
**Where**: `frontend/paginas/pack.js`; also `tests/pack-pagina.spec.js`, `tests/responsive.spec.js`, `tests/cabecalho.spec.js`
**Depends on**: T9
**Reuses**: The T5 page
**Requirement**: PAG-01, PAG-02, PAG-05, EDGE-01 (rev. 2)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `pack.html?id=metal-nux-mg-30` requests `GET /packs/metal-nux-mg-30` and `GET /presets?packId=metal-nux-mg-30`, both started before either answers; shows "Metal · NUX MG-30", "3 presets", its presets -> `tests/pack-pagina.spec.js`
- [x] `Rock-boss`, `rock_boss`, `../x`, `-rock`, `rock--boss`, missing id: not found without any request
- [x] Responsive and header tests use `pack.html?id=rock-boss-gt-1000`
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(pack): load style and model packs by id`

**Status**: Complete

Done in the T8 commit (see T8). A new test holds `/packs/{id}` and sees `/presets?packId=` start, proving the two reads run in parallel.

---

## Phase Execution Map

```
Phase 1 -> Phase 2

T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10
```

Ten tasks; the remaining three run inline. The Verifier runs automatically after T10 (it was stopped during T7 when revision 2 arrived).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Seed data + one API module | Granular |
| T2 | One service + two small UI functions | Granular (cohesive: the card shows what the join computes) |
| T3 | Page rename + pack rules + test rewrite | ⚠️ Largest; the list cannot show packs with preset filters, and the old tests cannot pass on a packs page, so they move together |
| T4 | One page module | Granular |
| T5 | One new page | Granular |
| T6 | Deletion + test page names | Granular |
| T7 | Three small fixes | Granular (cohesive: leftovers listed together by the user) |
| T8 | Seed data + one API function | Granular |
| T9 | Join + card + filter rules | Granular (one rule change across the list) |
| T10 | One page module | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 (phase boundary) | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T4 | T4 -> T5 | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 | T6 -> T7 | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |
| T9 | T8 | T8 -> T9 | ✅ Match |
| T10 | T9 | T9 -> T10 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Mock data, API layer | e2e | e2e | ✅ OK |
| T2 | Services, UI helpers | e2e | e2e | ✅ OK |
| T3 | Pages, markup | e2e | e2e | ✅ OK |
| T4 | Page module, markup | e2e | e2e | ✅ OK |
| T5 | Page module, markup, styles | e2e | e2e | ✅ OK |
| T6 | Markup removal, styles | e2e | e2e | ✅ OK |
| T7 | Markup, styles, README | e2e | e2e | ✅ OK |
| T8 | Mock data, API layer | e2e | e2e | ✅ OK |
| T9 | Services, UI, page, markup | e2e | e2e | ✅ OK |
| T10 | Page module | e2e | e2e | ✅ OK |

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| PACK-01, PACK-02, PACK-03 | T1 |
| LIST-02, LIST-05, EDGE-02 | T2 (service), T3 (page) |
| LIST-01, LIST-03, LIST-04, LIST-06 .. LIST-12, EDGE-03 | T3 |
| HOME-01, HOME-02, HOME-03 | T4 |
| PAG-01 .. PAG-09, EDGE-01 | T5 (EDGE-02 also on the pack page) |
| REM-01, REM-02 | T6 |
| FIX-01 .. FIX-04, REG-01 | T7 |
| REG-02 | T3, T4 |
| PACK-04 | T8 (PACK-01..03 revised there too) |
| LIST-13 | T9 (LIST-05..07 revised there too) |
| PAG-01, PAG-02, PAG-05, EDGE-01 (rev. 2) | T10 |

**Coverage:** 40 requirements, 40 mapped to tasks, 0 unmapped.
