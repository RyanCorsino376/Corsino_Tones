# Interactive Preset List & Login Validation - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa04-interatividade/spec.md`
**Design**: none - the two decisions below are recorded in `.specs/STATE.md` at the start of Execute; the rest is inline in the tasks
**Status**: Draft

### Decisions to record at Execute

- **AD-006: Presets come from a local array.** `frontend/dados.js` declares `PRESETS`; page scripts read it and never know where it came from. Rejected: `fetch` of a JSON file, which adds Promises and network-error handling with no server to justify them. When the API exists, only the source of `PRESETS` changes.
- **AD-007: Auth forms validate in script, with `novalidate`.** The `required`/`type` attributes stay in the markup (they still drive `validity` and act as the no-JS fallback), but the script owns the messages. Rejected: native bubbles, which cannot be styled or worded consistently.

### Stage requirement mapping

| `requisitos.md` item | Covered by |
| -------------------- | ---------- |
| DOM manipulation | T1, T2 (cards built with `createElement`), T6, T7 |
| Event handling | T3-T5 (`change`, `input`, `submit`, `reset`), T7, T8 |
| Form validation | T7, T8 |
| Dynamic interface change | T3-T6, T8 |
| Functions | `filtrar`, `ordenar`, `criarCartao`, `renderizar`, `validarCampo` |
| Arrays | `PRESETS` (T1) |
| Iteration methods | `map`/`forEach` (T1), `filter`/`some`/`includes` (T3-T4), `sort` (T5), `every` (T7) |
| Invalid situations | T6 (no results), T4 (special characters), T7-T8 (bad input) |

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Catalogue data (`frontend/dados.js`) | e2e | Shape and size asserted through the rendered page | `tests/presets-*.spec.js` | `npm test` |
| List script (`frontend/presets.js`, `frontend/inicio.js`) | e2e | 1:1 to CAT, FILT, EMPTY criteria and EDGE-01 | `tests/presets-*.spec.js` | `npm test` |
| Validation script (`frontend/login.js`) | e2e | 1:1 to VAL criteria, EDGE-02, EDGE-03 | `tests/login-validacao.spec.js` | `npm test` |
| Markup and styles | e2e | Through the behaviour above; existing responsive tests guard layout | `tests/*.spec.js` | `npm test` |

Tests read the expected values from `window.PRESETS` where a count or order depends on the data, so changing a sample preset does not break them; the rules (OR/AND, accent folding, order) are asserted against the spec, not re-implemented.

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on list tasks (T1-T6) | `npx playwright test tests/presets-lista.spec.js` |
| Quick | While working on validation tasks (T7-T8) | `npx playwright test tests/login-validacao.spec.js` |
| Full | Before every commit | `npx playwright test` |

Baseline before T1: **38 passing**. Every task must end at baseline + its new tests.

---

## Execution Plan

### Phase 1: Catalogue on screen

Data first, then the two pages that show it. Everything later filters this list.

```
T1 -> T2
```

### Phase 2: Filter, search, sort, empty state

Each task adds one control on top of a single `renderizar()` pipeline (`filtrar` -> `ordenar` -> cards), so every task is visible in the browser on its own.

```
T3 -> T4 -> T5 -> T6
```

### Phase 3: Login and registration validation

Independent of Phases 1-2 in code, run last so the list work lands first.

```
T7 -> T8
```

---

## Task Breakdown

### T1: Preset catalogue and card rendering on presets.html

**What**: Create `PRESETS` with 9 sample presets and render one card per entry, newest first, replacing the nine static placeholders; add a `<noscript>` message.
**Where**: `frontend/dados.js` (new), `frontend/presets.js` (new), `frontend/presets.html`, `frontend/style.css` (card text)
**Depends on**: None
**Reuses**: `.grade-presets` and `.grade-presets .cartao` grid rules (`frontend/style.css:381-397`); IIFE and naming pattern of `frontend/login.js`
**Requirement**: CAT-01, CAT-02, CAT-03, CAT-05

**Done when**:

- [x] `window.PRESETS` has 9 entries with the seven fields; every brand checkbox value and each of the four styles appears at least once -> `tests/presets-lista.spec.js:18-50`
- [x] `presets.html` renders 9 `.cartao` links to `preset.html`, each showing name, brand/equipment and style, ordered by `data` descending -> `tests/presets-lista.spec.js:52-82`
- [x] With JavaScript disabled, the page shows the `<noscript>` message -> `tests/presets-lista.spec.js:85-95`
- [x] Existing responsive tests on `presets.html` still pass (column counts need the rendered cards)
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 43 tests pass (38 + 5 new, no silent deletions)

**Tests**: e2e (`tests/presets-lista.spec.js`)
**Gate**: full
**Commit**: `feat(presets): render the preset catalogue from a data array`

**Status**: Complete

`PRESETS` is assigned to `window` rather than declared with `const`: a top-level `const` in a classic script is not a `window` property, and both the tests and T2 read the catalogue from outside `presets.js`. The array is stored out of date order on purpose, so the newest-first test fails if sorting is removed. `.grade-presets .cartao` changed from `display: block` to `flex` to stack the card text.

---

### T2: Home carousel rendered from the catalogue

**What**: Fill the home carousel from `PRESETS`, newest first, reusing the card builder.
**Where**: `frontend/inicio.js` (new), `frontend/cartao.js` (new - `criarCartao` and `ordenarMaisRecentes` moved here from `presets.js`), `frontend/index.html`, `frontend/presets.html`, `frontend/style.css`
**Depends on**: T1
**Reuses**: `criarCartao` from T1; `.carrossel .cartao` sizing (`frontend/style.css:143-160`)
**Requirement**: CAT-04

**Done when**:

- [x] `index.html` carousel shows 9 cards with names, first card = most recent preset -> `tests/presets-lista.spec.js:96-108`
- [x] `presets.html` still renders identically (shared builder) -> T1 tests unchanged and passing
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 44 tests pass

**Tests**: e2e
**Gate**: full
**Commit**: `feat(home): fill the carousel from the preset catalogue`

**Status**: Complete

Deviation: the card builder went to a new `cartao.js` instead of `dados.js`, so the data file keeps only data (AD-006). `display: flex` moved from `.grade-presets .cartao` to the base `.cartao`, since carousel cards are now `<a>` too.

---

### T3: Brand and style filters without reload

**What**: Add a "Estilos" checkbox group; filter on every `change` (OR within a group, AND across groups); make "Aplicar" update the list with `preventDefault`.
**Where**: `frontend/presets.html`, `frontend/presets.js`
**Depends on**: T2
**Reuses**: The existing `.filtros fieldset/ul/li` markup and styles - a new group needs no new class (`frontend/style.css:229-261`)
**Requirement**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-08

**Done when**:

- [x] Checking one brand shows only that brand; checking two shows the union -> `tests/presets-lista.spec.js` T3 block
- [x] Checking a brand and a style shows only presets matching both (Boss + rock: 2, where OR would give 3)
- [x] With nothing checked, all 9 presets show
- [x] Clicking "Aplicar" keeps `page.url()` unchanged and the list filtered (a `window` marker survives, proving no reload)
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 50 tests pass

**Tests**: e2e
**Gate**: full
**Commit**: `feat(presets): filter by brand and style without reloading`

**Status**: Complete

---

### T4: Text search

**What**: Add a search field above the grid; filter on `input` over `nome`, `equipamento`, `descricao`, case- and accent-insensitive (`normalize('NFD')`), using `includes` (no regular expressions).
**Where**: `frontend/presets.html`, `frontend/presets.js`, `frontend/style.css`
**Depends on**: T3
**Reuses**: `filtrar()` from T3 (search becomes one more criterion)
**Requirement**: FILT-05, FILT-06, EDGE-01

**Done when**:

- [x] Typing a lowercase, unaccented part of an accented name finds it -> `tests/presets-lista.spec.js` T4 block
- [x] Whitespace-only input shows all presets
- [x] Search combines with checked filters (AND)
- [x] Typing `(` or `.*` raises no page error (`page.on('pageerror')` stays empty)
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 56 tests pass

**Tests**: e2e
**Gate**: full
**Commit**: `feat(presets): search presets by text`

**Status**: Complete

The search box lives above the grid but joins the sidebar form through `form="form-filtros"`, so Enter triggers the form's prevented submit and T5's reset clears it. Its `input` event needs its own listener: events bubble through DOM ancestors, not through the form owner. An extra test covers Enter in the search field (FILT-08).

---

### T5: Sort order and full reset

**What**: Add an order `<select>` (Mais recentes / Mais antigos / Nome A-Z); make "Limpar" restore every control and the full list.
**Where**: `frontend/presets.html`, `frontend/presets.js`
**Depends on**: T4
**Reuses**: `ordenar()` slots into the `renderizar()` pipeline; native `reset` event (re-render after the browser clears the fields)
**Requirement**: FILT-07, FILT-09

**Done when**:

- [x] Each option produces the order the spec defines (dates ascending/descending, `localeCompare(…, 'pt-BR')`) -> `tests/presets-lista.spec.js` T5 block
- [x] Ordering applies to the filtered list, not the full catalogue
- [x] "Limpar" unchecks all boxes, empties search, selects "Mais recentes" and shows 9 cards
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 61 tests pass

**Tests**: e2e
**Gate**: full
**Commit**: `feat(presets): sort the list and reset all controls`

**Status**: Complete

The `reset` event fires before the browser clears the fields, so the redraw is deferred with `setTimeout(atualizar, 0)`. The select also joins the sidebar form via `form="form-filtros"`, and its `selected` option is what reset restores. Also fixed here: the "Estilos" group added in T3 had no gap above it (`.filtros fieldset + fieldset`), seen in a screenshot, not caught by any test.

---

### T6: Result count and empty state

**What**: Add an `aria-live="polite"` status line with the match count, and an empty-state message with a hint when nothing matches.
**Where**: `frontend/presets.html`, `frontend/presets.js`, `frontend/style.css`
**Depends on**: T5
**Reuses**: Look of `.biblioteca-vazia` for the empty state (`frontend/style.css`, "Biblioteca vazia" section)
**Requirement**: EMPTY-01, EMPTY-02, EMPTY-03

**Done when**:

- [x] Status reads "9 presets encontrados" on load, "1 preset encontrado" for a single match -> `tests/presets-lista.spec.js` T6 block
- [x] A no-match search renders zero cards and shows "Nenhum preset encontrado"
- [x] Clearing the search removes the message and restores the cards
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 65 tests pass

**Tests**: e2e
**Gate**: full
**Commit**: `feat(presets): show the match count and an empty state`

**Status**: Complete

The empty state shares the `.biblioteca-vazia` rules, whose `display: flex` overrides the `hidden` attribute, so `.lista-vazia[hidden]` restores `display: none`. The hint names the "Limpar" button; the spec only asks for "a hint to clear the filters", so the test checks for that word, not a full sentence.

---

### T7: Validation rules and messages on submit

**What**: Add `novalidate` to both forms and a `validarCampo` function with the name, e-mail and password rules; on submit, write each message into a per-field element, set `aria-invalid`/`aria-describedby`, focus the first rejected field, block the submit; on a fully valid submit show a success message.
**Where**: `frontend/login.html`, `frontend/login.js`, `frontend/style.css`
**Depends on**: T6
**Reuses**: The existing IIFE in `frontend/login.js` (flip code untouched); `--brand-accent` for error colour
**Requirement**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-06, VAL-07, EDGE-02, EDGE-03

**Done when**:

- [x] Registration rejects "R", "ryan@", "1234567" with three distinct messages; accepts "Ry", "ryan@x.com", "12345678" -> `tests/login-validacao.spec.js` T7 blocks
- [x] Login rejects a bad e-mail and an empty password; does not apply the 8-character rule
- [x] Rejected fields carry `aria-invalid="true"` and `aria-describedby` pointing at their message; focus is on the first one
- [x] Whitespace-only fields are rejected; a second invalid submit shows each message once
- [x] A valid submit keeps the URL and shows the success message
- [x] `tests/login-flip.spec.js` passes unchanged (its empty-password test must still see focus on `cadastro-senha`)
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 74 tests pass

**Tests**: e2e (`tests/login-validacao.spec.js`)
**Gate**: full
**Commit**: `feat(login): validate login and registration with inline messages`

**Status**: Complete

Two tests passed before any code: the browser's own validation already focuses the first bad field, and `toBeHidden` passes on a missing element. Both now also assert something only the script produces (`aria-invalid`, the success element's existence). Message elements are created on demand and reused by id, which is what keeps a second submit from duplicating them. Messages use `width: 200px; max-width: 100%`, not `min(200px, 100%)`: the percentage is ignored while the fieldset sizes itself to its content, and a long message pushed the e-mail field off-centre (seen in a screenshot, not caught by a test).

---

### T8: Clear messages while the user fixes a field

**What**: After a rejected submit, re-validate a field on `input` and remove its message and `aria-invalid` as soon as it becomes valid.
**Where**: `frontend/login.js`
**Depends on**: T7
**Reuses**: `validarCampo` from T7
**Requirement**: VAL-05

**Done when**:

- [x] Fixing the name removes only the name's message, without a new submit -> `tests/login-validacao.spec.js` T8 block
- [x] Before any submit, typing shows no messages
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 77 tests pass

**Tests**: e2e
**Gate**: full
**Commit**: `feat(login): clear field errors as soon as they are fixed`

**Status**: Complete

Only fields already marked `aria-invalid` are re-checked on `input`, which is what keeps the page quiet before the first submit. The "before any submit" and "still invalid" tests pass without the listener by design: they guard against an over-eager implementation, while the fix-the-name test is the one that failed first.

---

## Phase Execution Map

```
Phase 1 -> Phase 2 -> Phase 3

T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8
```

Eight tasks fit a single task-budgeted batch, so execution runs inline with no batch sub-agents. The Verifier runs automatically after T8.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | New data file + list script + markup swap | Granular |
| T2 | Carousel script | Granular |
| T3 | One filter group + filter function | Granular |
| T4 | One field + one criterion | Granular |
| T5 | One select + reset handler | Granular |
| T6 | Status line + empty state | Granular |
| T7 | Validation rules + messages | Granular |
| T8 | One `input` listener | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |

## Test Co-location Validation

Every task creates or changes product behaviour and carries `Tests: e2e`, matching the matrix. No task has `Tests: none`.

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| CAT-01, CAT-02, CAT-03, CAT-05 | T1 |
| CAT-04 | T2 |
| FILT-01, FILT-02, FILT-03, FILT-04, FILT-08 | T3 |
| FILT-05, FILT-06, EDGE-01 | T4 |
| FILT-07, FILT-09 | T5 |
| EMPTY-01, EMPTY-02, EMPTY-03 | T6 |
| VAL-01, VAL-02, VAL-03, VAL-04, VAL-06, VAL-07, EDGE-02, EDGE-03 | T7 |
| VAL-05 | T8 |

**Coverage:** 27 requirements, 27 mapped to tasks, 0 unmapped.

---

## Verifier Fixes (iteration 1)

The first Verifier run (`validation.md`) returned FAIL: behaviour was correct, but four mutants survived. Each fix below was confirmed by re-running its mutant in a scratch copy.

| Gap | Mutant | Fix | Kind |
| --- | ------ | --- | ---- |
| EMPTY-01: zero-result count unchecked | M14 (`=== 1` -> `<= 1`) | Empty-state test also asserts "0 presets encontrados" | test |
| VAL-01/02: e-mail anchors unchecked | V02 (regex without `^`/`$`) | New tests reject `ryan silva@x.com` on both forms | test |
| FILT-07: pt-BR order indistinguishable | M12 (code-point sort) | Sample preset renamed "Solo Ardente" -> "Ápice do Solo"; spec assumption added | data + spec |
| VAL-03: language unchecked | V19 (English message) | Spec fixes the four field messages; new tests assert the exact text | spec + test |

Test count: 81 passing.

## Verifier Fixes (iteration 2)

Iteration 2 returned FAIL with one survivor: V02b (only the trailing `$` removed from the e-mail rule), because the anchor tests only put invalid text before the valid part. The anchor tests now also reject `ryan@x.com silva` on both forms; V02b re-run in a scratch copy fails 2 tests.

Test count: 83 passing.
