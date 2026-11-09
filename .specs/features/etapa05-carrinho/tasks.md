# Shopping Cart - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa05-carrinho/spec.md`
**Design**: `.specs/features/etapa05-carrinho/design.md`
**Status**: Done (pending Verifier)

### Existing tests changed

T2 changes only the `position` reads in `tests/responsive.spec.js` (lines 35, 44, 57, 78): they read the computed `position` of `.acoes-cabecalho` instead of `.entrar`, because the positioning moves to the group (spec REG-02). The geometry checks on `.entrar` stay unchanged. Approving these tasks approves that change.

### Verifier speed

The Verifier runs each mutant only against the spec files that cover the mutated module, then the full suite once.

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: none; strong defaults applied. Style follows `tests/*.spec.js` (Playwright, Portuguese test names, requirement IDs in comments; service modules imported inside a page).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Service (`frontend/servicos/carrinho.js`) | e2e (module in page) | All branches; 1:1 to CAR-* and EDGE-03 | `tests/carrinho-servico.spec.js` | `npx playwright test` |
| Header (`frontend/ui/cabecalho.js`, markup, styles) | e2e | HDR-*; REG-02 layout | `tests/cabecalho.spec.js`, `tests/responsive.spec.js` | `npx playwright test` |
| Pages (`frontend/paginas/pack.js`, `frontend/paginas/carrinho.js`, `carrinho.html`) | e2e | ADD-*, PAGC-*, EDGE-01, EDGE-02: happy + edge + error | `tests/carrinho-pagina.spec.js` | `npx playwright test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `npx playwright test tests/<files of the task>` |
| Full | Before every commit | `npx playwright test` |
| Build | After the last task | `npx playwright test` |

Baseline before T1: **233 passing**.

---

## Execution Plan

### Phase 1: Storage and header

```
T1 -> T2
```

### Phase 2: Pages

```
T3 -> T4
```

---

## Task Breakdown

### T1: Cart service

**What**: Create `itensDoCarrinho`, `estaNoCarrinho`, `adicionarAoCarrinho`, `removerDoCarrinho` and `esvaziarCarrinho` over `localStorage` key `corsino:carrinho`.
**Where**: `frontend/servicos/carrinho.js` (new)
**Depends on**: None
**Reuses**: Structure of `frontend/servicos/sessao.js`
**Requirement**: CAR-01, CAR-02, CAR-03, CAR-04, EDGE-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Adding `rock-boss-gt-1000` twice and `clean-zoom-g6` once stores exactly `["rock-boss-gt-1000","clean-zoom-g6"]` -> `tests/carrinho-servico.spec.js`
- [x] Removing the first of three ids keeps the other two in order
- [x] `estaNoCarrinho` is true for a stored id and false otherwise
- [x] A non-array value, an array with a number, and an array with `../x` each read as `[]` and remove the key
- [x] `["a-b","a-b","c"]` reads as `["a-b","c"]`
- [x] `esvaziarCarrinho` removes the key
- [x] Full gate passes; test count reported

**Tests**: e2e (`tests/carrinho-servico.spec.js`)
**Gate**: full
**Commit**: `feat(cart): keep the cart in localStorage`

**Status**: Complete

Test count: 243 (233 + 10).

---

### T2: Cart link and counter in every header

**What**: Add the header group with the cart link (icon + "Carrinho (N)") to every page, move the header positioning to the group, update the counter from `ui/cabecalho.js`, and make "Sair" empty the cart.
**Where**: `frontend/ui/cabecalho.js`; also `index.html`, `packs.html`, `pack.html`, `biblioteca.html`, `login.html`, `frontend/paginas/login.js`, `frontend/style.css`, `tests/cabecalho.spec.js`, `tests/responsive.spec.js`
**Depends on**: T1
**Reuses**: "Entrar" link markup and styles; `atualizarCabecalho`
**Requirement**: HDR-01 (pages except `carrinho.html`), HDR-03, HDR-04, HDR-05, REG-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Each of the five pages shows a link to `carrinho.html` reading "Carrinho (0)" with an empty cart and "Carrinho (2)" with two ids stored -> `tests/cabecalho.spec.js`
- [x] Signed in, the link sits next to "Olá, Ryan" / "Sair"; signed out, next to "Entrar"
- [x] "Sair" leaves `corsino:carrinho` absent and `index.html` shows "Carrinho (0)"
- [x] A cart filled before signing in is still there after signing in through `login.html`
- [x] `tests/responsive.spec.js` passes with only its `position` reads moved to `.acoes-cabecalho`; no overflow at 320-1440 px
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(header): show the cart link with a pack counter`

**Status**: Complete

Test count: 251 (243 + 8). The four `position` reads in `responsive.spec.js` now read `.acoes-cabecalho`; the geometry checks on `.entrar` are unchanged and pass. Header checked in screenshots at 1280 px and 375 px.

---

### T3: "Adicionar ao carrinho" on the pack page

**What**: Show "Adicionar ao carrinho" or "No carrinho" in the pack information block; adding updates the cart, the button, a status message and the counter without leaving the page.
**Where**: `frontend/paginas/pack.js`; also `frontend/pack.html`, `frontend/style.css`, `tests/carrinho-pagina.spec.js` (new)
**Depends on**: T2
**Reuses**: `mostrarPack`; `.botao-tentar`; `atualizarContadorCarrinho`
**Requirement**: ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, HDR-02 (add), EDGE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A pack not in the cart shows the "Adicionar ao carrinho" button -> `tests/carrinho-pagina.spec.js`
- [x] Clicking it stores the id, shows the "No carrinho" link to `carrinho.html`, shows "Pack adicionado ao carrinho." in `role="status"`, header reads "Carrinho (1)", and the page did not reload (`window` marker)
- [x] Reloading still shows "No carrinho"; a pack stored before opening the page (another tab) shows "No carrinho"
- [x] Double-clicking the button stores the id once
- [x] Not-found, loading and error states show neither the button nor the link
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(pack): add the pack to the cart from its page`

**Status**: Complete

Test count: 259 (251 + 8). Found while testing: the second click of a double click lands on the "No carrinho" link that replaced the button and opens `carrinho.html`. The pack is still stored once (ADD-04 holds); the test documents the navigation. Reported to the user as a UX choice. The two absence tests (not found; loading/error) pass before the code by design: they guard against a button shown at the wrong time.

---

### T4: Cart page

**What**: Create `carrinho.html` and `paginas/carrinho.js`: list cart packs with link, price and "Remover", count and total, empty state, removed-pack notice, loading and error.
**Where**: `frontend/paginas/carrinho.js` (new); also `frontend/carrinho.html` (new), `frontend/style.css`, `tests/carrinho-pagina.spec.js`, `tests/cabecalho.spec.js` (page list)
**Depends on**: T3
**Reuses**: `carregarComEstado`, `listarPacks`, `formatarPreco`, `atualizarCabecalho`
**Requirement**: PAGC-01 .. PAGC-08, HDR-01 (`carrinho.html`), HDR-02 (remove), EDGE-02, REG-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] With `clean-zoom-g6` then `rock-boss-gt-1000` stored, the page requests `GET /packs` and lists the two in that order, each linking to its pack page, with its formatted price and a "Remover" button -> `tests/carrinho-pagina.spec.js`
- [x] Count "2 packs no carrinho" and total equal to the formatted sum of the two prices from the API
- [x] "Remover" on the first: one item left, "1 pack no carrinho", new total, header "Carrinho (1)", storage updated, no reload, no new request
- [x] Removing the last item shows "Seu carrinho está vazio." and "Ver os packs" → `packs.html`, no total
- [x] Empty cart on load: empty state and no request to the API
- [x] A stored unknown id (`jazz-boss-x`) is removed from storage, not listed, not summed, and the notice shows
- [x] Held request: "Carregando carrinho..." and no items; aborted request: error text + "Tentar novamente", storage unchanged; retry loads the list
- [x] `carrinho.html` header shows the cart link and "Entrar"/"Olá"
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(cart): add the cart page with removal and total`

**Status**: Complete

Test count: 268 (259 + 9). Found by the tests: removing the last item hid the list but left the item in the page; `mostrarVazio` now clears it. Test fix: routes on `/packs` are armed after `gravarCarrinho`, because `index.html` (used to store the cart) also requests `/packs`. `carrinho.html` joined the no-horizontal-overflow test; checked in screenshots at 1280 and 375 px.

---

## Phase Execution Map

```
Phase 1 -> Phase 2

T1 -> T2 -> T3 -> T4
```

Four tasks fit one batch, so execution runs inline. The Verifier runs automatically after T4.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | One service module | Granular |
| T2 | One UI function + the same markup on five pages | Granular (cohesive: the header must be the same everywhere) |
| T3 | One page behaviour | Granular |
| T4 | One new page | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 (phase boundary) | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Service | e2e | e2e | ✅ OK |
| T2 | Header, markup, styles | e2e | e2e | ✅ OK |
| T3 | Page module, markup, styles | e2e | e2e | ✅ OK |
| T4 | Page module, markup, styles | e2e | e2e | ✅ OK |

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| CAR-01 .. CAR-04, EDGE-03 | T1 |
| HDR-01, HDR-03, HDR-04, HDR-05, REG-02 | T2 (HDR-01 for `carrinho.html` in T4) |
| ADD-01 .. ADD-05, EDGE-01 | T3 |
| HDR-02 | T3 (add), T4 (remove) |
| PAGC-01 .. PAGC-08, EDGE-02, REG-01 | T4 |

**Coverage:** 27 requirements, 27 mapped to tasks, 0 unmapped.
