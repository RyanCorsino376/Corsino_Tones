# Library and Downloads - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa05-biblioteca/spec.md`
**Design**: none (inline: the change reuses `api/`, `servicos/catalogo.js`, `ui/estado.js`; see Design notes)
**Status**: Done (Verifier PASS, 327 tests, 13/13 mutants killed)

### Design notes (inline)

- `api/pedidos.js` gains `listarPedidosPagos(usuarioId)`: `GET /pedidos?usuarioId={id}&status=pago`.
- `servicos/biblioteca.js` (new): `packsDaBiblioteca(pedidos, catalogo)` is a pure function (ordering, de-duplication, missing packs); `carregarBiblioteca(usuarioId)` reads orders and catalogue together; `idsComprados(usuarioId)` reads only the orders, for `pack.html`.
- Most recent order = greatest `criadoEm`; equal dates fall back to the greater `id`.
- `ui/download.js` (new): `baixarPreset(preset)` builds a Blob with the JSON and clicks a temporary link named `preset-{id}.json`. `ui/` never imports `api/` (AD-009).
- Only the library renders "Download" (plan R4).

### Verifier speed and ports

Each mutant runs only against the spec files covering the mutated module. The dev servers the user keeps open on 3000/8080 are stopped before the Verifier and restarted after it.

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: none; strong defaults applied. Style follows `tests/*.spec.js` (Playwright, Portuguese test names, requirement IDs in comments; service modules imported inside a page). Lesson L-014: fixtures use values that differ per item (distinct prices, a second user, ids other than 1).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| API (`frontend/api/pedidos.js`) | e2e (module in page) | Request URL carries `usuarioId` and `status=pago` | `tests/biblioteca-servico.spec.js` | `npx playwright test` |
| Service (`frontend/servicos/biblioteca.js`) | e2e (module in page) | Ordering, de-duplication, missing pack, second user, non-paid order | `tests/biblioteca-servico.spec.js` | `npx playwright test` |
| UI (`frontend/ui/download.js`) | e2e | File name and JSON content | `tests/biblioteca.spec.js` | `npx playwright test` |
| Pages (`frontend/paginas/biblioteca.js`, `frontend/paginas/pack.js`, HTML) | e2e | 1:1 to LIB, DL, OWN, REG: happy + edge + error | `tests/biblioteca.spec.js`, `tests/pack-pagina.spec.js` | `npx playwright test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `npx playwright test tests/<files of the task>` |
| Full | Before every commit | `npx playwright test` |
| Build | After the last task | `npx playwright test` |

Baseline before T1: **303 passing**.

---

## Execution Plan

### Phase 1: Service

```
T1
```

### Phase 2: Library page

```
T2 -> T3
```

### Phase 3: Pack page

```
T4
```

---

## Task Breakdown

### T1: Paid orders API and library service

**What**: Add `listarPedidosPagos`, and `servicos/biblioteca.js` with the pure join (`packsDaBiblioteca`), `carregarBiblioteca` and `idsComprados`.
**Where**: `frontend/api/pedidos.js`, `frontend/servicos/biblioteca.js` (new), `tests/biblioteca-servico.spec.js` (new)
**Depends on**: None
**Reuses**: `requisicao`, `carregarCatalogo`
**Requirement**: LIB-01, LIB-02, LIB-04, LIB-05, LIB-07 (rules), OWN-01 (read)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `listarPedidosPagos(7)` requests `GET /pedidos?usuarioId=7&status=pago` and resolves with the list -> `tests/biblioteca-servico.spec.js`
- [x] `packsDaBiblioteca` with orders `[{id:1, criadoEm:'2026-11-01...', packIds:['a','b']}, {id:2, criadoEm:'2026-11-05...', packIds:['c','a']}]` and a catalogue of a, b, c returns `c, a, b` (newest order first, then `packIds` order, `a` once at its newest position)
- [x] A `packId` missing from the catalogue is dropped; no orders returns `[]`
- [x] Two orders with the same `criadoEm` order by the greater `id`
- [x] `carregarBiblioteca(7)` shows only user 7's packs when user 1 also has a paid order, and ignores an order with `status: 'pendente'` (real mock data created in the test)
- [x] `idsComprados(7)` resolves with the set of distinct pack ids
- [x] Full gate passes; test count reported

**Tests**: e2e (`tests/biblioteca-servico.spec.js`)
**Gate**: full
**Commit**: `feat(library): add the paid orders API and the library service`

**Status**: Complete

Test count: 311 (305 + 6). Mutants of the service and the API (sort direction, tie-break, de-duplication, missing pack, `status=pago` in the URL) each fail at least one test; the first status mutant hit a comment and was redone on the code line.

---

### T2: Library page

**What**: Replace the static empty block with the states and the pack blocks (name, preset count, one row per preset), keeping the signed-out pop-up.
**Where**: `frontend/paginas/biblioteca.js`, `frontend/biblioteca.html`, `frontend/style.css`, `tests/biblioteca.spec.js` (new)
**Depends on**: T1
**Reuses**: `carregarBiblioteca`, `carregarComEstado`, `pedirLogin`, `ROTULOS`
**Requirement**: LIB-01 .. LIB-09, REG-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Signed out: the pop-up "Faça login para acessar sua biblioteca", no library request, URL unchanged after 60 s of fake clock and no `meta refresh` (lessons L-009/L-010) -> `tests/biblioteca.spec.js`
- [x] Signed in with paid orders of two packs (distinct names, preset counts 3 and 2): one block per pack in newest-order-first order, each with "N presets" and one row per preset (name, "{marca} · {equipamento}", description); a second user's pack is absent; an order with status `pendente` adds nothing
- [x] The same pack in two paid orders shows one block
- [x] A `packId` with no pack: no block and no notice
- [x] No paid order: "Sua biblioteca ainda está vazia." and "Explorar packs" -> `packs.html`; with orders neither is in the page
- [x] Held request: "Carregando biblioteca..." and no block; aborted: error text with "Tentar novamente", no block; the retry shows the library
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(library): list the bought packs and their presets`

**Status**: Complete

Test count: 319 (311 + 8). Page mutants (empty text, preset count, description, session user id, hidden list) each fail a test; a first run let "list always hidden" survive because a count ignores visibility, so the main test now asserts the first block is visible. The singular "1 preset" is covered by serving a single preset through `page.route`.

---

### T3: Download of each preset

**What**: Add a "Download" button to every preset row that saves `preset-{id}.json`.
**Where**: `frontend/ui/download.js` (new), `frontend/paginas/biblioteca.js`, `frontend/style.css`, `tests/biblioteca.spec.js`
**Depends on**: T2
**Reuses**: `.botao-tentar` style
**Requirement**: DL-01 .. DL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Every preset row has a "Download" button (count equals the number of preset rows) -> `tests/biblioteca.spec.js`
- [x] Activating it on the second preset of a pack saves the file `preset-{that id}.json` (Playwright `download` event); its content parsed as JSON equals `{ id, nome, estilo, marca, equipamento, descricao, packId }` of that preset, not of another
- [x] `pack.html`, `packs.html` and `index.html` contain no "Download" button or link
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(library): download each preset as a JSON file`

**Status**: Complete

Test count: 322 (319 + 3). Mutants (file name, `packId` missing from the JSON, button label, a "Download" link on `pack.html`, a changed field) each fail a test. Test data fix in this commit: the user ids in `tests/biblioteca*.spec.js` were `Date.now() % 100000` counters that repeat every 100 s, and orders from earlier runs stay in `db.json`, so one run met an old order; they are now random. One full run had a timeout in `pagamento.spec.js` (fake clock, load); the test passed 9 of 9 in isolation and the full rerun passed.

---

### T4: "Na biblioteca" on the pack page (R2)

**What**: When the signed-in user already bought the pack, show the link "Na biblioteca" instead of the add button.
**Where**: `frontend/paginas/pack.js`, `frontend/style.css`, `tests/pack-pagina.spec.js` (existing)
**Depends on**: T1
**Reuses**: `idsComprados`, `usuarioAtual`, `mostrarAcaoCarrinho`
**Requirement**: OWN-01 .. OWN-04, REG-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Signed in as a user with a paid order of pack A: A shows "Na biblioteca" -> `biblioteca.html` and no "Adicionar ao carrinho"; pack B shows the add button
- [x] A pack bought only by another user shows "Adicionar ao carrinho"
- [x] Signed out: add button and no request to `/pedidos`
- [x] Orders request aborted: the pack and "Adicionar ao carrinho" still show
- [x] A pack in the cart that was not bought still shows "No carrinho" (existing tests pass unchanged)
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(pack): show "Na biblioteca" for a pack already bought`

**Status**: Complete

Test count: 327 (322 + 5). Mutants (no session guard, a fixed user id, the failure rethrown, the "Na biblioteca" branch removed or forced, `status=pago` dropped from the URL) each fail a test, except the removal of the `!usuario` guard: that one is equivalent, because `usuario.id` throws, the `catch` returns false and no request is sent either way.

---

## Phase Execution Map

```
Phase 1 -> Phase 2 -> Phase 3

T1 -> T2 -> T3
T1 -> T4
```

Four tasks fit one batch, so execution runs inline. The Verifier runs automatically after T4.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | One API function + one service module | Granular (cohesive: the order read and its join) |
| T2 | One page: states and render | Granular |
| T3 | One button + one small UI helper | Granular |
| T4 | One branch of one page | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 -> T2 (phase boundary) | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T1 | T1 -> T4 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | API, service | e2e | e2e | ✅ OK |
| T2 | Page, markup, styles | e2e | e2e | ✅ OK |
| T3 | UI, page | e2e | e2e | ✅ OK |
| T4 | Page | e2e | e2e | ✅ OK |

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| LIB-01, LIB-02, LIB-04, LIB-05, LIB-07 | T1 (rules), T2 (page) |
| LIB-03, LIB-06, LIB-08, LIB-09, REG-01 | T2 |
| DL-01 .. DL-04 | T3 |
| OWN-01 .. OWN-04, REG-02 | T4 (OWN-01 read in T1) |

**Coverage:** 19 requirements, 19 mapped to tasks, 0 unmapped.
