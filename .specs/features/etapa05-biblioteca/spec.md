# Library and Downloads - Specification

Slice 6 of `.specs/features/etapa05-loja/plano.md` (the last one of stage 05).

## Problem Statement

A purchase ends with "Ir para a biblioteca", but the library is still an empty page. This slice makes it real: `biblioteca.html` lists the packs the signed-in user has paid for, with a download for each preset of each pack. It also applies plan rule R2: on `pack.html` a pack already bought shows "Na biblioteca" instead of "Adicionar ao carrinho". The library is derived from paid orders (plan D4), never stored on its own.

## Goals

- [ ] A user who completed a purchase opens the library and sees exactly the packs of their paid orders, each with its presets and a "Download" for every preset.
- [ ] "Download" saves a file generated in the browser with the preset's data.
- [ ] A pack already bought cannot be added to the cart again.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Real preset files for the pedalboards | The seed has no files; the download is generated from the preset data (user choice) |
| Protecting the download from direct access | Front end plus json-server protects nothing (plan, security note); real protection is Spring Boot |
| Order history, invoices, refunds | Not in the store plan |
| Blocking a bought pack that is already inside a stored cart | The cart is emptied on purchase; a stale cart in another tab is not handled |
| Sorting, searching or filtering the library | Not in the store plan |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| What "Download" saves | A JSON file generated in the browser (Blob) named `preset-{preset id}.json`, with `id`, `nome`, `estilo`, `marca`, `equipamento`, `descricao`, `packId` of the preset | User choice; the seed has no files; testable with Playwright | y |
| Rule R2 | In this slice: a signed-in user who bought a pack sees the link "Na biblioteca" to `biblioteca.html` on `pack.html`, with no add button | User choice | y |
| Source of the library | `GET /pedidos?usuarioId={id}&status=pago`; the packs are the distinct `packIds` of those orders; names, presets and prices come from the catalogue (`GET /packs`, `GET /presets`) | Plan D4: one source of truth, no "library" table | n |
| Order of the packs | Most recent order first; inside one order, the order of its `packIds`; a pack bought twice shows once, at its most recent position | Newest purchase on top is what a buyer expects; a duplicate row would be noise | n |
| A paid pack missing from the catalogue | Not shown, no notice | The library cannot describe a pack it cannot read; the order stays on the server | n |
| Library states | Loading: "Carregando biblioteca..." · Error: "Não foi possível carregar a biblioteca. Verifique sua conexão e tente novamente." with "Tentar novamente" · Empty: "Sua biblioteca ainda está vazia." with "Explorar packs" to `packs.html` | Same pattern as the cart (`carregarComEstado`); the empty text already exists on the page | n |
| Pack block | Pack name, preset count ("1 preset" / "N presets"), then one row per preset: name, "{marca} · {equipamento}", description and a "Download" button | Same wording as the pack page | n |
| Signed-out visitor | Unchanged: the slice 2 pop-up "Faça login para acessar sua biblioteca" | Already shipped and tested; no library request is made | y |
| `pack.html` when the orders request fails | The page works as before: the add button shows | The orders read must not block browsing; the library remains the place that proves ownership | n |
| `pack.html` for a signed-out visitor | Unchanged: no orders request, add button | Ownership needs a user | n |
| "Download" on other pages | Never shown on `pack.html` or anywhere except the library | Plan rule R4 | y |
| Spec language | English | `validate_spec.py` matches EARS keywords in English | y |

**Implicit-requirement sweep:**
- Input validation: the pack id comes from orders; a `packId` that matches nothing is dropped (LIB-07). Download file names use only the numeric preset id.
- Failure states: the library cannot load (LIB-05); the orders read fails on `pack.html` (OWN-04).
- Idempotency / duplicates: a pack in two paid orders shows once (LIB-04).
- Auth boundaries: only the signed-in user's orders (LIB-02); signed-out keeps the pop-up (REG-01).
- State transitions: loading, then empty, list or error (LIB-05, LIB-06, LIB-08).
- Data lifecycle: nothing is stored; the library is read on every visit.
- Concurrency: N/A because the page only reads.
- Observability: request failures are logged by `api/cliente.js`. Rate limits: N/A (no server logic).

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Library of bought packs ⭐ MVP

**User Story**: As a buyer, I want to see the packs I paid for so that I can find my presets.

**Why P1**: It is the end of the purchase flow and the stage's second query-plus-render use of the order data.

**Acceptance Criteria**

1. WHEN `biblioteca.html` loads with a session THEN the system SHALL request `GET /pedidos` filtered by the session's `usuarioId` and `status` `pago`, then the catalogue.
2. The system SHALL show only packs from paid orders of the signed-in user, never from another user's orders or from an order whose status is not `pago`.
3. WHEN the user has paid orders THEN the system SHALL show one block per distinct pack with its name, its preset count and one row per preset (name, "{marca} · {equipamento}", description).
4. IF a pack is in more than one paid order THEN the system SHALL show it once.
5. The system SHALL list the packs from the most recent order to the oldest, and the packs of one order in the order of its `packIds`.
6. IF the user has no paid order THEN the system SHALL show "Sua biblioteca ainda está vazia." and "Explorar packs" to `packs.html`.
7. IF a paid `packId` has no pack in the catalogue THEN the system SHALL NOT show it and SHALL show no notice.
8. WHILE the requests are pending, the system SHALL show "Carregando biblioteca..." and no pack block.
9. IF a request fails to communicate THEN the system SHALL show "Não foi possível carregar a biblioteca. Verifique sua conexão e tente novamente." with "Tentar novamente", and no pack block.

**Independent Test**: Buy two packs at checkout, open the library; both packs show with their presets. A second user's library does not show them.

---

### P1: Download of each preset ⭐ MVP

**User Story**: As a buyer, I want to download each preset of my packs.

**Why P1**: Downloading is the purpose of buying.

**Acceptance Criteria**

1. The system SHALL show a "Download" button on every preset row of the library.
2. WHEN the user activates "Download" on a preset THEN the system SHALL save a file named `preset-{preset id}.json`.
3. The saved file SHALL be a JSON object with `id`, `nome`, `estilo`, `marca`, `equipamento`, `descricao` and `packId` equal to the preset's values.
4. The system SHALL NOT show "Download" on `pack.html`, `packs.html` or `index.html`.

**Independent Test**: In the library, activate "Download" on a preset; the browser saves `preset-1.json` with that preset's data.

---

### P1: A bought pack is not sold again (R2) ⭐ MVP

**User Story**: As a buyer, I want the store to tell me I already own a pack so that I do not buy it twice.

**Why P1**: Plan rule R2; closes the purchase loop.

**Acceptance Criteria**

1. WHEN `pack.html` loads for a signed-in user whose paid orders include the pack THEN the system SHALL show a link "Na biblioteca" to `biblioteca.html` and SHALL NOT show "Adicionar ao carrinho".
2. WHEN `pack.html` loads for a signed-in user who has not bought the pack THEN the system SHALL show "Adicionar ao carrinho" as before, even if another user bought it.
3. WHEN `pack.html` loads without a session THEN the system SHALL show "Adicionar ao carrinho" and SHALL send no request to `/pedidos`.
4. IF the request for the orders fails to communicate THEN the system SHALL still show the pack with "Adicionar ao carrinho".

**Independent Test**: After buying a pack, open its page; "Na biblioteca" shows. Another pack still shows "Adicionar ao carrinho".

---

### P1: Existing behaviour kept ⭐ MVP

**Acceptance Criteria**

1. WHEN `biblioteca.html` loads without a session THEN the system SHALL keep the slice 2 pop-up "Faça login para acessar sua biblioteca", SHALL send no library request and SHALL NOT change the location by itself.
2. The system SHALL keep the "No carrinho" link on `pack.html` for a pack in the cart that the user has not bought.

---

## Edge Cases

- IF the same user has two paid orders with the same pack THEN the system SHALL show one block (LIB-04).
- IF an order has `status` other than `pago` THEN the system SHALL NOT list its packs (LIB-02).
- WHEN a user signs out and another signs in THEN the system SHALL show the second user's library only (LIB-02).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LIB-01 | P1: Library of bought packs | Tasks | Pending |
| LIB-02 | P1: Library of bought packs | Tasks | Pending |
| LIB-03 | P1: Library of bought packs | Tasks | Pending |
| LIB-04 | P1: Library of bought packs | Tasks | Pending |
| LIB-05 | P1: Library of bought packs | Tasks | Pending |
| LIB-06 | P1: Library of bought packs | Tasks | Pending |
| LIB-07 | P1: Library of bought packs | Tasks | Pending |
| LIB-08 | P1: Library of bought packs | Tasks | Pending |
| LIB-09 | P1: Library of bought packs | Tasks | Pending |
| DL-01 | P1: Download of each preset | Tasks | Pending |
| DL-02 | P1: Download of each preset | Tasks | Pending |
| DL-03 | P1: Download of each preset | Tasks | Pending |
| DL-04 | P1: Download of each preset | Tasks | Pending |
| OWN-01 | P1: A bought pack is not sold again | Tasks | Pending |
| OWN-02 | P1: A bought pack is not sold again | Tasks | Pending |
| OWN-03 | P1: A bought pack is not sold again | Tasks | Pending |
| OWN-04 | P1: A bought pack is not sold again | Tasks | Pending |
| REG-01 | P1: Existing behaviour kept | Tasks | Pending |
| REG-02 | P1: Existing behaviour kept | Tasks | Pending |

**Coverage:** 19 total, 0 mapped to tasks yet.

---

## Success Criteria

- [ ] A purchase made at checkout shows up in the library of the same user, with a working download per preset.
- [ ] Opening the page of a bought pack never offers to buy it again.
- [ ] The full suite keeps passing, with the new tests derived from these criteria.
