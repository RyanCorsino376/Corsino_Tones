# Preset Catalogue from a Mock API, as ES Modules - Specification

Slice 1 of `.specs/features/etapa05-loja/plano.md`.

## Problem Statement

Stage 05 requires modular code, asynchronous calls through the Fetch API with `async/await`, and handled loading and error states against an external or simulated data source. Today the catalogue is a hard-coded `window.PRESETS` array in `frontend/dados.js` (AD-006), and every script shares state through `window.*` globals, so there is no network call, no loading state and no failure to handle.

This slice moves the catalogue behind a json-server mock API and converts the page scripts to ES modules. It is the foundation the store slices (login, cart, checkout, library) build on.

## Goals

- [ ] `presets.html` and `index.html` show the catalogue fetched from the mock API, with a visible loading state and a recoverable error state.
- [ ] No page script reads or writes catalogue data or helpers through `window`; all sharing goes through `import`/`export`.
- [ ] Filter, search, sort, count and empty-state behaviour from `etapa04-interatividade` is unchanged once the data has loaded.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Prices on cards or detail page | Slice 3 (dynamic detail page) |
| Real login against the API, session | Slice 2 |
| Any write operation (`POST`) | Slice 2 (`POST /usuarios`) and slice 5 (`POST /pedidos`) |
| Dynamic `preset.html?id=` | Slice 3 |
| Cart, checkout, library | Slices 4-6 |
| Caching the catalogue between page loads | One small request per page; caching adds staleness rules for no gain |
| Server-side filtering (`?marca=`) | The list is 9 items; client-side filtering already exists and stays |
| Resetting `db.json` before tests | This slice only reads; the seed/reset step arrives with the first write (slice 2) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Mock server | `json-server@0.17.4`, data file `mock/db.json`, port 3000, started by `npm run api` (`json-server --watch mock/db.json --port 3000`) | Already installed; 0.17 serves CORS headers by default, so pages on port 8080 can call it | y |
| API base URL | `http://127.0.0.1:3000`, defined once in `frontend/api/cliente.js` | One place to change when Spring Boot replaces the mock | n |
| Catalogue content | `GET /presets` returns the same 9 presets currently in `dados.js`, same fields and values | Keeps the 83 existing tests meaningful (they assert on these names, dates and brands) | n |
| Labels (`ROTULOS`) | Move to a frontend module, not to the API | They are display text, not data; the API sends keys (`boss`), the UI chooses wording | n |
| Request timeout | 8000 ms, then treated as a failure | Without it a hung server leaves the loading state on forever | n |
| What counts as failure | Network error, timeout, non-2xx status, or a body that is not a JSON array | `fetch` resolves on 404/500, so status must be checked; a non-array body would crash the filter pipeline | n |
| Loading text | "Carregando presets..." | Fixed wording makes the AC testable | n |
| Error text | "Não foi possível carregar os presets. Verifique sua conexão e tente novamente." with a button "Tentar novamente" | Same; tells the visitor what happened and what to do | n |
| Filters during loading | Controls stay usable; when data arrives the current criteria are applied | Disabling them adds state for a sub-second wait; applying current criteria means nothing the visitor typed is lost | n |
| Empty catalogue (`[]`) | Treated as success: count "0 presets encontrados" and the existing empty-state message | It is a valid answer, not a failure; the existing empty state already covers "nothing to show" | n |
| Module loading | `<script type="module">`; `dados.js` and the `window.*` exports are removed | Requirement "separate code into modules"; globals are what modules replace | n |
| Opening pages via `file://` | Unsupported; pages must be served over HTTP | Browsers block ES modules over `file://`; the project already serves through HTTP for tests | n |
| No-JavaScript fallback | The existing `<noscript>` message stays on `presets.html` | Unchanged behaviour (CAT-05 of etapa04) | n |
| Observability | `console.error` with the underlying error on every failed request | Lets a developer see the real cause behind the friendly message; no logging service exists | n |
| Spec language | English | `validate_spec.py` matches EARS keywords in English; matches existing specs | y |

**Implicit-requirement sweep:** external-dependency failure, failure states and observability are covered below. Input validation, idempotency, auth, concurrency, data lifecycle and state transitions are N/A for this slice because it performs a single read with no user input sent to the server and no stored state.

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Catalogue served by the mock API ⭐ MVP

**User Story**: As the developer, I want the catalogue to come from an HTTP API so that the front end works the same way it will with the Spring Boot back end.

**Why P1**: Every other story in this slice depends on data arriving over the network.

**Acceptance Criteria**

1. WHEN `npm run api` runs THEN the system SHALL serve `GET http://127.0.0.1:3000/presets` returning a JSON array of the 9 presets with fields `id`, `nome`, `marca`, `equipamento`, `estilo`, `data` and `descricao`.
2. WHEN `presets.html` loads THEN the system SHALL request the catalogue from `GET /presets` with the Fetch API.
3. WHEN `index.html` loads THEN the system SHALL request the catalogue from `GET /presets` with the Fetch API.
4. WHEN the catalogue arrives on `presets.html` THEN the system SHALL render it with the current filters, search and order applied, newest first by default.
5. WHEN the catalogue arrives on `index.html` THEN the system SHALL render it in the carousel, newest first.

**Independent Test**: Run `npm run api`, open `presets.html`; nine cards appear and the browser's network tab shows a request to `:3000/presets`.

---

### P1: Loading state ⭐ MVP

**User Story**: As a visitor, I want to see that the list is loading so that an empty area does not look broken.

**Why P1**: Required by stage 05 ("tratar estados de carregamento").

**Acceptance Criteria**

1. WHILE the catalogue request is pending on `presets.html`, the system SHALL show "Carregando presets..." in a `role="status"` element and SHALL render no cards.
2. WHILE the catalogue request is pending on `index.html`, the system SHALL show "Carregando presets..." in a `role="status"` element inside the carousel area.
3. WHEN the request finishes, successfully or not, THEN the system SHALL remove the loading message.
4. WHILE the request is pending on `presets.html`, the system SHALL NOT show the count text or the empty-state message.

**Independent Test**: Start json-server with `--delay 2000`; open `presets.html`; "Carregando presets..." shows for two seconds, then the cards replace it.

---

### P1: Communication error state ⭐ MVP

**User Story**: As a visitor, I want a clear message and a way to retry when the list cannot load so that I am not stuck on a blank page.

**Why P1**: Required by stage 05 ("tratar erros de comunicação").

**Acceptance Criteria**

1. IF the catalogue request fails by network error THEN the system SHALL show "Não foi possível carregar os presets. Verifique sua conexão e tente novamente." and a "Tentar novamente" button.
2. IF the catalogue request returns a non-2xx status THEN the system SHALL show the same error message and button.
3. IF the catalogue request does not finish within 8000 ms THEN the system SHALL abort it and show the same error message and button.
4. IF the response body is not a JSON array THEN the system SHALL show the same error message and button.
5. WHEN the visitor activates "Tentar novamente" THEN the system SHALL remove the error message, show the loading state and repeat the request.
6. WHILE the error state is shown on `presets.html`, the system SHALL render no cards and SHALL NOT show the count text or the empty-state message.
7. IF a catalogue request fails THEN the system SHALL write the underlying error to `console.error`.
8. The error state SHALL appear on both `presets.html` and `index.html`.

**Independent Test**: With json-server stopped, open `presets.html`; the error message and button appear; start json-server and click "Tentar novamente"; the cards load.

---

### P1: Code organised as ES modules ⭐ MVP

**User Story**: As the developer, I want each concern in its own module so that the store slices can reuse the API, UI and page code without a single file holding everything.

**Why P1**: Required by stage 05 ("separar o código em módulos", "evitar um único arquivo").

**Acceptance Criteria**

1. The system SHALL load every page script on `presets.html` and `index.html` with `<script type="module">`.
2. The system SHALL perform HTTP requests only from modules under `frontend/api/`.
3. The system SHALL NOT define `window.PRESETS`, `window.ROTULOS`, `window.criarCartao` or `window.ordenarMaisRecentes`.
4. The system SHALL keep `login.html` and its flip and validation behaviour working.

**Independent Test**: Open `presets.html`, run `window.PRESETS` in the console; it is `undefined`, yet the list works.

---

### P1: Etapa 04 behaviour preserved ⭐ MVP

**User Story**: As a visitor, I want filtering, search, sorting and the empty state to keep working so that the move to an API costs me nothing.

**Why P1**: A regression here would undo a delivered stage.

**Acceptance Criteria**

1. WHEN the catalogue has loaded THEN the system SHALL satisfy every acceptance criterion of `etapa04-interatividade` (CAT-02 to CAT-05, FILT-01 to FILT-09, EMPTY-01 to EMPTY-03, EDGE-01).
2. IF the API returns an empty array THEN the system SHALL show "0 presets encontrados" and the existing empty-state message.

**Independent Test**: The existing Playwright suite passes with json-server running.

---

## Edge Cases

- WHEN the visitor changes a filter while the catalogue is loading THEN the system SHALL apply that filter to the list once it arrives.
- IF the visitor activates "Tentar novamente" and the request fails again THEN the system SHALL show the error state again, exactly once (no duplicated messages or buttons).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| API-01 | P1: Catalogue served by the mock API | Tasks | Implementing |
| API-02 | P1: Catalogue served by the mock API | Specify | Pending |
| API-03 | P1: Catalogue served by the mock API | Specify | Pending |
| API-04 | P1: Catalogue served by the mock API | Specify | Pending |
| API-05 | P1: Catalogue served by the mock API | Specify | Pending |
| LOAD-01 | P1: Loading state | Specify | Pending |
| LOAD-02 | P1: Loading state | Specify | Pending |
| LOAD-03 | P1: Loading state | Specify | Pending |
| LOAD-04 | P1: Loading state | Specify | Pending |
| ERR-01 | P1: Communication error state | Specify | Pending |
| ERR-02 | P1: Communication error state | Specify | Pending |
| ERR-03 | P1: Communication error state | Specify | Pending |
| ERR-04 | P1: Communication error state | Specify | Pending |
| ERR-05 | P1: Communication error state | Specify | Pending |
| ERR-06 | P1: Communication error state | Specify | Pending |
| ERR-07 | P1: Communication error state | Specify | Pending |
| ERR-08 | P1: Communication error state | Specify | Pending |
| MOD-01 | P1: Code organised as ES modules | Specify | Pending |
| MOD-02 | P1: Code organised as ES modules | Specify | Pending |
| MOD-03 | P1: Code organised as ES modules | Specify | Pending |
| MOD-04 | P1: Code organised as ES modules | Specify | Pending |
| REG-01 | P1: Etapa 04 behaviour preserved | Specify | Pending |
| REG-02 | P1: Etapa 04 behaviour preserved | Specify | Pending |
| EDGE-01 | Edge cases | Specify | Pending |
| EDGE-02 | Edge cases | Specify | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`. `EDGE-*` is scoped to this feature.

**Status values:** Pending -> In Design -> In Tasks -> Implementing -> Verified

**Coverage:** 25 total, 0 mapped to tasks, 25 unmapped (tasks not written yet)

---

## Success Criteria

- [ ] With json-server running, all existing Playwright tests pass after waiting for the list to load.
- [ ] Stopping json-server produces the error message and a working retry, never a blank page.
- [ ] `grep -rn "window\.\(PRESETS\|ROTULOS\|criarCartao\|ordenarMaisRecentes\)" frontend/` returns nothing.
- [ ] `fetch(` appears only under `frontend/api/`.
