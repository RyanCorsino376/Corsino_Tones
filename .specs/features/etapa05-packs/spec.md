# Style Packs Replace Preset Cards - Specification

Slice 3 of `.specs/features/etapa05-loja/plano.md` (revised 2026-11-06: the store sells packs; there are no preset cards).

> **Revision 2 (2026-11-06, after T7):** a pack is **one style for one pedalboard model** ("Rock · Boss GT-1000"), not one style for every model. The sample data grows so each pack has 2-3 presets. Criteria changed by this revision are marked *(rev. 2)*; T8-T10 in `tasks.md` implement it.

## Problem Statement

The store sells **packs of one style for one pedalboard model** ("Rock · Boss GT-1000"), so everything in a pack works on the buyer's device. The site still shows single presets everywhere: the "Presets" page and the home carousel draw one card per preset, and every card opens a static `preset.html` with a free "Download" link.

This slice turns the "Presets" page into a **"Packs"** page that lists pack cards with the same filters, search, sort, count and empty state; makes the home carousel show packs; adds one page per pack with its price and the presets it includes; and removes the single-preset page. It also closes three items left from slice 2: the home text, the look of a disabled button and the outdated README.

## Goals

- [ ] A visitor sees only pack cards, never preset cards, on the "Packs" page and on the home page.
- [ ] Filters, search, sort, count and empty state work on packs as they worked on presets.
- [ ] Every pack has a page with its price and the list of presets it includes.
- [ ] No page offers a single preset or a free download.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| "Adicionar ao carrinho" button on the pack page | Slice 4 (cart) |
| "Na biblioteca" state for bought packs | Slice 6 (library) |
| A pack mixing styles or models | User chose one style for one model (revision 2) |
| Sort by price | Every pack has the same price |
| Parameter table, step-by-step guide, demonstration videos | Belonged to the removed single-preset page; the mock has no such data |
| Updating `docs/proposta.md` to the paid, pack-based store | Recorded in the plan as a follow-up |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| What is sold *(rev. 2)* | One pack per style **and** pedalboard model, e.g. "Rock · Boss GT-1000"; a pack holds only presets of that style made for that model | User choice: a preset for one device does not work on another | y |
| Sample data *(rev. 2)* | Four models (Boss GT-1000, Zoom G6, NUX MG-30, Line 6 HX Stomp), nine packs, 21 presets, 2-3 per pack: Boss GT-1000 Rock (3), Metal (2), Blues (2); Zoom G6 Rock (3), Clean (2); NUX MG-30 Metal (3), Clean (2); Line 6 HX Stomp Blues (2), Rock (2). The existing presets of these four models are kept; the others are replaced | User chose to grow the data so packs are meaningful; fewer models keep every model with several packs | y |
| Preset cards | None anywhere: the list page and the home carousel show pack cards only | User choice (2026-11-06) | y |
| The "Presets" page | Becomes the "Packs" page, keeping filters, search, sort, count and empty state | User choice (2026-11-06) | y |
| Page file and menu | `presets.html` is renamed `packs.html` (`git mv`); the menu shows "Página Inicial · Packs · Biblioteca" | The URL then says what the page shows; there is no separate presets page left | n |
| Single-preset page | `preset.html` and `paginas/preset.js` are deleted | User choice | y |
| Pack price | One price for every pack, R$ 49,90, stored as `precoCentavos: 4990` | User chose a single price; the value is a proposal for this review | n |
| Pending fixes included | Home text, disabled-button style, README | User choice | y |
| Pack record *(rev. 2)* | `packs`: `{ id, nome, estilo, marca, equipamento, descricao, precoCentavos }`; `id` = `{estilo}-{marca}-{equipamento}` in lowercase with non-alphanumerics as `-` (`rock-boss-gt-1000`); `nome` = "{Style label} · {Brand label} {equipamento}". Each preset gains `packId`; presets get no price | `packId` lets the list and the pack page read packs and presets in parallel; a readable id makes URLs like `pack.html?id=rock-boss-gt-1000` | n |
| Pack/preset consistency *(rev. 2)* | Every preset's `estilo`, `marca` and `equipamento` equal those of its pack | `packId` repeats information; a test guards against the two drifting apart | n |
| Pack descriptions *(rev. 2)* | One sentence each in the seed | Proposal for this review | n |
| Data for the list and the carousel *(rev. 2)* | `GET /packs` and `GET /presets` in parallel (`Promise.all`); a pack's presets are those with its `packId`, joined in the browser | Filters and search need the presets inside each pack; two independent reads at once are faster than one after the other | n |
| Pack card *(rev. 2)* | Name (which already says style and model), "{N} presets" ("1 preset" when N is 1), price; links to `pack.html?id={id}` | A brands line would repeat the model already in the name | n |
| Brand filter on packs *(rev. 2)* | Shows the packs whose `marca` is checked; OR inside the group. The checkboxes list only the four brands in the data: Boss, Line 6, NUX, Zoom | A brand with no pack would be a dead-end option (etapa04 assumption) | n |
| Style filter on packs *(rev. 2)* | Shows the packs whose `estilo` is checked; OR inside the group; AND with the brand group | Same rule as etapa04 | n |
| Search on packs *(rev. 2)* | Accent- and case-insensitive, surrounding spaces ignored, literal text; matches the pack `nome`, `descricao` or `equipamento`, or the `nome` or `descricao` of any preset inside it | Typing a model ("g6") or a preset name finds where to buy it | n |
| Sort on packs | "Mais recentes": by the newest preset date in the pack, newest first (default); "Mais antigos": by that same date, oldest first; "Nome (A-Z)": pack name, `pt-BR` collation | Keeps the three existing options; a pack is as recent as its newest preset | n |
| Count and empty state | "{N} packs encontrados" / "1 pack encontrado"; "Nenhum pack encontrado" with the same hint to "Limpar" | Same wording pattern as etapa04 | n |
| Home carousel | Title "Packs"; one pack card per pack, newest first (same rule as "Mais recentes") | User asked for no preset cards anywhere | n |
| Price format | `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` ("R$ 49,90", non-breaking space after "R$") | The browser's own currency format; tests compare against the same formatter's output | n |
| Loading and error texts | List and carousel: "Carregando packs..." / "Não foi possível carregar os packs. Verifique sua conexão e tente novamente."; pack page: "Carregando pack..." / "Não foi possível carregar o pack. Verifique sua conexão e tente novamente."; all with "Tentar novamente" | Same `carregarComEstado` pattern as slice 1, renamed from "presets" | n |
| Pack page | `pack.html?id={id}`: name, description, price, "{N} presets", then a plain list (not cards) of the included presets with name, brand · equipment and description; reuses the two-column `.preset-topo` block | Showing the contents is not a preset card; the existing responsive rules and tests for that block keep applying | n |
| Invalid pack id *(rev. 2)* | Missing or not matching `^[a-z0-9]+(-[a-z0-9]+)*$` → "Pack não encontrado." with a link "Ver todos os packs" to `packs.html`, without any request; a well-formed id answered with 404 → same message | Avoids a request that can only fail | n |
| New home text | "Compre uma vez e baixe quando quiser na sua biblioteca"; `<meta name="description">` drops "download gratuito" too | Replaces the free-download promise; the user can reword it at review | n |
| Disabled button style | Any disabled `button` gets reduced opacity and `cursor: not-allowed` | One rule covers "Entrando...", "Cadastrando..." and future buttons | n |
| README | Describes stage 05 and the packs, `npm run api` / `api:lento` / `api:reset`, the test account, the module folders, links to `docs/etapa-05.md`; no `login.js` or `preset.html` | It still says stage 03 | n |
| etapa04 list criteria | CAT-01..05, FILT-01..09, EMPTY-01..03 and EDGE-01 of `etapa04-interatividade` are superseded by LIST-* here: the same behaviours, applied to packs. `tests/presets-lista.spec.js` is rewritten for packs (renamed `tests/packs-lista.spec.js`) | The list shows packs now; asserting nine preset cards would test a page that no longer exists | n |
| Slice 1 tests | Tests that open `presets.html` or count 9 cards (loading, error, modules, carousel) switch to `packs.html` and the pack count of the data; the messages follow the new texts. Slice 1 API-01 ("the same nine presets") is superseded by the revision 2 data | Same criteria, new page, texts and data | n |
| Responsive tests | `presets.html` → `packs.html`; `preset.html` → `pack.html?id={a rock pack}` | Same layout rules, renamed pages | n |
| Spec language | English | `validate_spec.py` matches EARS keywords in English | y |

**Implicit-requirement sweep:** input validation (the pack `id`, PAG-05, EDGE-01; search text, LIST-07); failure states and external-dependency failure (LIST-03, PAG-07, one of two parallel reads failing, EDGE-02); observability (already logged by `api/cliente.js`). Idempotency, auth, concurrency, data lifecycle and state transitions are N/A for this slice because it only reads public data.

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Packs in the mock API ⭐ MVP

**User Story**: As the developer, I want packs to exist in the API so that the pages, the cart and the orders all refer to the same records.

**Why P1**: Everything else in the store refers to a pack id.

**Acceptance Criteria**

1. *(rev. 2)* The system SHALL serve `GET /packs` as an array of the nine packs of the sample data, each with `id`, `nome`, `estilo`, `marca`, `equipamento`, `descricao` and `precoCentavos` equal to `4990`.
2. The system SHALL serve `GET /packs/{id}` for each pack id and answer 404 for any other id.
3. *(rev. 2)* The system SHALL serve the 21 presets of the sample data, each with a `packId` of an existing pack and with no price field.
4. *(rev. 2)* Every preset SHALL have the same `estilo`, `marca` and `equipamento` as its pack.

**Independent Test**: `GET /packs` returns nine records; `GET /presets?packId=rock-boss-gt-1000` returns its three presets.

---

### P1: Packs page with filters, search and sort ⭐ MVP

**User Story**: As a guitarist, I want to narrow the packs to my equipment and style, search and reorder them so that I find the pack worth buying.

**Why P1**: It is where buying starts, and it keeps everything the presets page could do.

**Acceptance Criteria**

1. Every page header SHALL show the menu "Página Inicial", "Packs" (to `packs.html`) and "Biblioteca", with no "Presets" link, and SHALL mark "Packs" with `aria-current="page"` on `packs.html`.
2. WHEN `packs.html` loads THEN the system SHALL request `GET /packs` and `GET /presets` without waiting for one before starting the other.
3. IF either request fails THEN the system SHALL show "Não foi possível carregar os packs. Verifique sua conexão e tente novamente." with a "Tentar novamente" button that repeats both requests, and SHALL show no card, count or empty-state message.
4. WHILE the requests are pending, the system SHALL show "Carregando packs..." in a `role="status"` element and no card.
5. *(rev. 2)* WHEN both answers arrive THEN the system SHALL show one card per pack, newest first, each with its `nome`, "{N} presets" ("1 preset" when N is 1) and its formatted price, linking to `pack.html?id={id}`.
6. *(rev. 2)* WHEN the visitor checks brands or styles THEN the system SHALL show only the packs whose `marca` is checked AND whose `estilo` is checked, with OR inside each group and an empty group not restricting, without reloading the page.
7. *(rev. 2)* WHEN the visitor types in the search field THEN the system SHALL show only the packs whose `nome`, `descricao` or `equipamento`, or whose included presets' `nome` or `descricao`, contain the typed text, ignoring case, accents and surrounding spaces, and treating regular-expression characters as literal text.
8. WHEN the visitor picks an order THEN the system SHALL list the visible packs by their newest preset date (newest first or oldest first) or by name A-Z (`pt-BR` collation).
9. WHEN the visitor activates "Aplicar" THEN the system SHALL update the list without reloading; WHEN the visitor activates "Limpar" THEN the system SHALL uncheck every filter, empty the search, restore "Mais recentes" and show every pack.
10. WHEN the list updates THEN the system SHALL announce "{N} packs encontrados" ("1 pack encontrado" when N is 1) in the existing live region.
11. IF no pack matches THEN the system SHALL show "Nenhum pack encontrado" and the hint to clear the filters, and SHALL render no cards.
12. The page SHALL NOT render any preset card.
13. *(rev. 2)* The brand filter SHALL offer exactly the brands present in the packs: Boss, Line 6, NUX and Zoom.

**Independent Test**: Open "Packs"; nine cards show. Check "Zoom": its two packs remain. Type "g6": the same two. Type "zzzz": "Nenhum pack encontrado".

---

### P1: Packs on the home page ⭐ MVP

**User Story**: As a visitor, I want the home page to show the packs so that I can go straight to one.

**Why P1**: The home page must not show preset cards either.

**Acceptance Criteria**

1. WHEN `index.html` loads THEN the system SHALL show a carousel titled "Packs" with one pack card per pack, newest first, linking to `pack.html?id={id}`.
2. The home page SHALL NOT render any preset card.
3. The home carousel SHALL keep the loading and error states of slice 1, with the texts "Carregando packs..." and "Não foi possível carregar os packs. Verifique sua conexão e tente novamente.".

**Independent Test**: Open `index.html`; the nine pack cards show under "Packs".

---

### P1: Pack page ⭐ MVP

**User Story**: As a visitor, I want a pack's page to show its price and every preset it includes so that I know exactly what I would buy.

**Why P1**: The "Adicionar ao carrinho" button of slice 4 lives on this page.

**Acceptance Criteria**

1. *(rev. 2)* WHEN `pack.html?id={id}` loads with a well-formed id THEN the system SHALL request `GET /packs/{id}` and `GET /presets?packId={id}` without waiting for one before starting the other.
2. WHEN both answers arrive THEN the system SHALL show the pack `nome` in the `<h1>`, its `descricao`, its formatted price and "{N} presets", and list every preset of the pack, as list items and not cards, with its `nome`, "{brand label} · {equipamento}" and `descricao`.
3. WHEN the pack arrives THEN the system SHALL set the document title to "{nome} | CorsinoTones".
4. The pack page SHALL NOT contain any download link.
5. *(rev. 2)* IF `id` is missing or does not match `^[a-z0-9]+(-[a-z0-9]+)*$` THEN the system SHALL show "Pack não encontrado." and a link "Ver todos os packs" to `packs.html`, and SHALL NOT send any request.
6. IF the API answers 404 for the pack THEN the system SHALL show "Pack não encontrado." and the link "Ver todos os packs".
7. IF a request fails to communicate THEN the system SHALL show "Não foi possível carregar o pack. Verifique sua conexão e tente novamente." and a "Tentar novamente" button that repeats the requests.
8. WHILE the requests are pending, the system SHALL show "Carregando pack..." in a `role="status"` element and SHALL NOT show the pack information block.
9. WHILE the not-found message or the error message is shown, the system SHALL NOT show the pack information block.

**Independent Test**: Open `pack.html?id=metal-nux-mg-30`; "Metal · NUX MG-30", "R$ 49,90", "3 presets" and "Distorção Moderna" show. Open `pack.html?id=jazz`; "Pack não encontrado." appears.

---

### P1: No single-preset pages ⭐ MVP

**User Story**: As the store owner, I want no page to present a preset on its own, since presets are sold only inside packs.

**Why P1**: A single-preset page would suggest it can be bought alone.

**Acceptance Criteria**

1. The system SHALL NOT serve `frontend/preset.html`, `frontend/paginas/preset.js` or `frontend/presets.html`.
2. No page SHALL link to `preset.html` or `presets.html`.

**Independent Test**: Search the `frontend/` folder for `preset.html` and `presets.html`; nothing is found.

---

### P2: Leftovers from slice 2

**User Story**: As a visitor and as a reader of the repository, I want the site and the README to describe what the project does today.

**Why P2**: Small, but the home page currently promises something the store contradicts.

**Acceptance Criteria**

1. The home page SHALL show "Compre uma vez e baixe quando quiser na sua biblioteca" and SHALL NOT contain "download gratuito", in its body or in its `<meta name="description">`.
2. WHILE a `button` is disabled, the system SHALL render it with an opacity lower than 1 and `cursor: not-allowed`.
3. The README SHALL state that the project is at stage 05, SHALL describe the packs, SHALL list `npm run api`, `npm run api:lento` and `npm run api:reset` and the test account `ryan@exemplo.com` / `teste123`, and SHALL link to `docs/etapa-05.md`.
4. The README SHALL NOT mention `frontend/login.js`, `preset.html` or `presets.html`.

**Independent Test**: Open `index.html`; the new text shows. Submit the login with the API held; the "Entrando..." button looks faded.

---

### P1: Existing behaviour preserved ⭐ MVP

**User Story**: As the developer, I want everything else delivered in stage 05 to keep working.

**Why P1**: The header, the session and the library are shared by every page.

**Acceptance Criteria**

1. The system SHALL keep every criterion of `etapa05-auth` satisfied.
2. The system SHALL keep the criteria of `etapa05-api-modulos` satisfied on `packs.html` and `index.html`, with the texts and counts this spec defines.

**Independent Test**: The whole Playwright suite passes.

---

## Edge Cases

- *(rev. 2)* IF the pack `id` has capitals, symbols or misplaced dashes (`Rock-boss`, `rock_boss`, `../x`, `-rock`, `rock--boss`) THEN the system SHALL treat it as not found without a request.
- IF `GET /packs` succeeds but `GET /presets` fails THEN the system SHALL show the error state, not cards with a wrong count or wrong brands.
- WHEN the visitor checks a filter while the packs are loading THEN the system SHALL apply it when the data arrives (slice 1 EDGE-01, on packs).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PACK-01 | P1: Packs in the mock API | Tasks | Verified |
| PACK-02 | P1: Packs in the mock API | Tasks | Verified |
| PACK-03 | P1: Packs in the mock API | Tasks | Verified |
| PACK-04 | P1: Packs in the mock API | Tasks | Verified |
| LIST-01 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-02 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-03 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-04 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-05 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-06 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-07 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-08 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-09 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-10 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-11 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-12 | P1: Packs page with filters, search and sort | Tasks | Verified |
| LIST-13 | P1: Packs page with filters, search and sort | Tasks | Verified |
| HOME-01 | P1: Packs on the home page | Tasks | Verified |
| HOME-02 | P1: Packs on the home page | Tasks | Verified |
| HOME-03 | P1: Packs on the home page | Tasks | Verified |
| PAG-01 | P1: Pack page | Tasks | Verified |
| PAG-02 | P1: Pack page | Tasks | Verified |
| PAG-03 | P1: Pack page | Tasks | Verified |
| PAG-04 | P1: Pack page | Tasks | Verified |
| PAG-05 | P1: Pack page | Tasks | Verified |
| PAG-06 | P1: Pack page | Tasks | Verified |
| PAG-07 | P1: Pack page | Tasks | Verified |
| PAG-08 | P1: Pack page | Tasks | Verified |
| PAG-09 | P1: Pack page | Tasks | Verified |
| REM-01 | P1: No single-preset pages | Tasks | Verified |
| REM-02 | P1: No single-preset pages | Tasks | Verified |
| FIX-01 | P2: Leftovers from slice 2 | Tasks | Verified |
| FIX-02 | P2: Leftovers from slice 2 | Tasks | Verified |
| FIX-03 | P2: Leftovers from slice 2 | Tasks | Verified |
| FIX-04 | P2: Leftovers from slice 2 | Tasks | Verified |
| REG-01 | P1: Existing behaviour preserved | Tasks | Verified |
| REG-02 | P1: Existing behaviour preserved | Tasks | Verified |
| EDGE-01 | Edge cases | Tasks | Verified |
| EDGE-02 | Edge cases | Tasks | Verified |
| EDGE-03 | Edge cases | Tasks | Verified |

**ID format:** `[CATEGORY]-[NUMBER]`. `REG-*` and `EDGE-*` are scoped to this feature.

**Status values:** Pending -> In Design -> In Tasks -> Implementing -> Verified

**Coverage:** 40 total, 40 mapped to tasks (see `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] No page renders a preset card; the "Packs" page and the home show pack cards only.
- [ ] Every filter, search, sort, count and empty-state behaviour of the old presets page works on packs.
- [ ] Every pack page shows its price and its presets; an unknown pack shows "Pack não encontrado.".
- [ ] No page contains a download link, a link to `preset.html` or `presets.html`, or the words "download gratuito".
- [ ] The full Playwright suite passes.
