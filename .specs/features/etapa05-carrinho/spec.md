# Shopping Cart - Specification

Slice 4 of `.specs/features/etapa05-loja/plano.md`.

## Problem Statement

The store shows packs and prices (slice 3) but a visitor cannot pick anything to buy. The plan's flow is pack page → "Adicionar ao carrinho" → `carrinho.html` → checkout (slice 5). This slice adds the cart: a list of chosen packs kept in the browser, the button on the pack page, a cart link with a counter in every header, and the cart page with prices, removal and total.

## Goals

- [ ] A visitor, signed in or not, can add a pack from its page and see the header counter go up without leaving the page.
- [ ] The cart page lists the chosen packs with their current prices and the total, and lets the visitor remove any of them.
- [ ] A pack can never be in the cart twice.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| "Finalizar compra" button and `checkout.html` | Slice 5 (checkout and order) |
| "Na biblioteca" instead of "Adicionar ao carrinho" for bought packs (R2) | Slice 6 (library) needs orders first |
| Quantities | A pack is a digital file; quantity is always 1 (plan R3) |
| Cart per user account, merging carts on login | User chose one cart per browser |
| Syncing the cart across open tabs | Not requested; each page reads the cart when it loads |
| Coupons, discounts, shipping | Not part of the store plan |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Whose cart | One cart per browser: what a visitor adds stays after login | User choice | y |
| Cart on "Sair" | "Sair" empties the cart | User choice: the next person on the same computer must not see the previous choices | y |
| After "Adicionar ao carrinho" | Stay on the pack page; the button becomes a link "No carrinho" to `carrinho.html`; the header counter goes up; "Pack adicionado ao carrinho." shows in a `role="status"` element | User choice | y |
| Cart access | A link "Carrinho (N)" with an icon next to "Entrar" / "Olá, {name}" in the header of every page | User choice | y |
| Storage | `localStorage` key `corsino:carrinho` holding a JSON array of pack ids, in the order they were added; only `servicos/carrinho.js` reads or writes it | Plan D2; `localStorage` survives closing the tab, which a cart should; one module owns it (AD-009) | n |
| What is stored | Pack ids only; names and prices are read from the API when the cart page opens | A price stored in the browser could go stale or be edited; the checkout of slice 5 also prices from the server | n |
| Corrupt storage | A value that is not a JSON array of strings is treated as an empty cart and removed | Same rule as the session in slice 2 | n |
| Unknown pack in the cart | If the API has no pack for a stored id, the cart page removes it and shows "Um pack do seu carrinho não está mais disponível e foi removido." | The visitor learns why an item disappeared; the cart never shows an item that cannot be bought | n |
| Counter | "Carrinho (N)", N = number of packs in the cart, including "Carrinho (0)" | Always visible keeps the header stable; zero is still useful information | n |
| Header layout | The cart link and "Entrar"/"Olá" sit together on the right of the navigation in the tablet and desktop ranges and drop below the menu links on mobile, as "Entrar" does today; the responsive criteria of `login-flip-responsive` that name "Entrar" apply to that group | The existing breakpoint behaviour is kept; the group moves as one | n |
| Cart page texts | Title "Carrinho"; count "{N} packs no carrinho" / "1 pack no carrinho"; total "Total: {price}"; empty "Seu carrinho está vazio." with a link "Ver os packs" to `packs.html`; each item has a link to its pack page and a "Remover" button | Fixed wording makes the criteria testable | n |
| Cart page loading/error | "Carregando carrinho..." / "Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente." + "Tentar novamente"; an empty cart shows the empty state without any request | Same `carregarComEstado` pattern as slices 1 and 3; no request is needed to show nothing | n |
| Cart page access | Open to visitors (no login) | Plan R1 as changed on 2026-11-05: only checkout and library need a session | y |
| Spec language | English | `validate_spec.py` matches EARS keywords in English | y |

**Implicit-requirement sweep:**
- Input validation: stored ids that are not well-formed pack ids are dropped (CAR-03); unknown packs are removed on the cart page (PAGC-07).
- Idempotency / duplicates: adding a pack already in the cart changes nothing (CAR-02, ADD-04).
- Failure states and external-dependency failure: cart page communication failure (PAGC-08); adding to the cart needs no request, so it cannot fail on the network.
- Data lifecycle: the cart lives until "Sair" empties it or the visitor removes items (HDR-04).
- State transitions: "Adicionar ao carrinho" → "No carrinho" (ADD-02); removing the last item → empty state (PAGC-05).
- Auth: none needed for the cart (plan R1). Concurrency: N/A, one browser tab writes at a time and tabs are not synced (Out of Scope). Observability: request failures are already logged by `api/cliente.js`. Rate limits: N/A, no server writes.

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Cart storage ⭐ MVP

**User Story**: As the developer, I want one module to own the cart so that every page reads and changes it the same way.

**Why P1**: The pack page, the header and the cart page all depend on it.

**Acceptance Criteria**

1. The system SHALL keep the cart in `localStorage` under `corsino:carrinho` as a JSON array of pack ids, in the order they were added.
2. WHEN a pack id already in the cart is added again THEN the system SHALL leave the cart unchanged.
3. IF the stored value is not a JSON array, or holds an item that does not match `^[a-z0-9]+(-[a-z0-9]+)*$` THEN the system SHALL treat the cart as empty and remove the key.
4. WHEN a pack id is removed THEN the system SHALL keep the other ids in their order.

**Independent Test**: Add `rock-boss-gt-1000` twice and `clean-zoom-g6` once; the key holds `["rock-boss-gt-1000","clean-zoom-g6"]`.

---

### P1: Add to cart on the pack page ⭐ MVP

**User Story**: As a visitor, I want to put a pack in my cart from its page so that I can buy it later.

**Why P1**: It is the only way into the cart.

**Acceptance Criteria**

1. WHILE the pack is not in the cart, the pack page SHALL show a button "Adicionar ao carrinho" in the pack information block.
2. WHEN the visitor activates "Adicionar ao carrinho" THEN the system SHALL add the pack id to the cart, replace the button with a link "No carrinho" to `carrinho.html`, show "Pack adicionado ao carrinho." in a `role="status"` element, and SHALL NOT reload or leave the page.
3. WHILE the pack is already in the cart, the pack page SHALL show the link "No carrinho" to `carrinho.html` instead of the button, also after a reload.
4. The system SHALL NOT add a pack to the cart twice, however many times the page is used.
5. WHILE the pack page shows the not-found, loading or error state, the system SHALL NOT show the button or the link.

**Independent Test**: Open `pack.html?id=rock-zoom-g6`, click "Adicionar ao carrinho"; the header shows "Carrinho (1)" and the button became "No carrinho"; reload; it still says "No carrinho".

---

### P1: Cart link in the header ⭐ MVP

**User Story**: As a visitor, I want to see how many packs I chose and reach the cart from any page.

**Why P1**: The cart page is useless if nobody can find it.

**Acceptance Criteria**

1. The header of `index.html`, `packs.html`, `pack.html`, `biblioteca.html`, `login.html` and `carrinho.html` SHALL show a link to `carrinho.html` with the text "Carrinho ({N})", N being the number of packs in the cart.
2. WHEN a pack is added or removed on the current page THEN the system SHALL update N without reloading.
3. The cart link SHALL be shown both signed in and signed out, next to "Entrar" or "Olá, {first name}".
4. WHEN the visitor activates "Sair" THEN the system SHALL empty the cart, so `index.html` shows "Carrinho (0)".
5. WHEN a visitor with packs in the cart signs in THEN the system SHALL keep those packs in the cart.

**Independent Test**: Add one pack, open `packs.html`; the header says "Carrinho (1)". Sign in; still 1. Click "Sair"; "Carrinho (0)".

---

### P1: Cart page ⭐ MVP

**User Story**: As a visitor, I want to review the packs I chose, their prices and the total, and remove what I do not want.

**Why P1**: The checkout of slice 5 starts from this page.

**Acceptance Criteria**

1. WHEN `carrinho.html` loads with packs in the cart THEN the system SHALL request `GET /packs` and list, in the order they were added, each cart pack with its `nome` linking to `pack.html?id={id}`, its formatted price and a "Remover" button.
2. The cart page SHALL show "{N} packs no carrinho" ("1 pack no carrinho" when N is 1) and "Total: {formatted sum of the listed prices}", the sum computed in integer cents.
3. WHEN the visitor activates "Remover" on an item THEN the system SHALL remove that pack from the cart, from the list and from the total, update the count and the header counter, and SHALL NOT reload the page.
4. WHEN `carrinho.html` loads with an empty cart THEN the system SHALL show "Seu carrinho está vazio." and a link "Ver os packs" to `packs.html`, SHALL NOT send any request, and SHALL show no total.
5. WHEN the last item is removed THEN the system SHALL show the empty state of PAGC-04.
6. WHILE the request is pending, the system SHALL show "Carregando carrinho..." in a `role="status"` element and no items.
7. IF a stored pack id has no pack in the API THEN the system SHALL remove it from the cart, leave it out of the list and the total, and show "Um pack do seu carrinho não está mais disponível e foi removido.".
8. IF the request fails to communicate THEN the system SHALL show "Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente." and a "Tentar novamente" button that repeats it, and SHALL keep the cart unchanged.

**Independent Test**: Add two packs, open the cart: two items, "2 packs no carrinho", "Total: R$ 99,80". Remove one: "1 pack no carrinho", "Total: R$ 49,90", header "Carrinho (1)".

---

### P1: Existing behaviour preserved ⭐ MVP

**User Story**: As the developer, I want everything delivered so far to keep working.

**Why P1**: The header and the pack page are shared.

**Acceptance Criteria**

1. The system SHALL keep every criterion of `etapa05-api-modulos`, `etapa05-auth` and `etapa05-packs` satisfied.
2. The system SHALL keep the layout criteria of `login-flip-responsive`, applying those that name "Entrar" to the group formed by the cart link and "Entrar"/"Olá".

**Independent Test**: The whole Playwright suite passes.

---

## Edge Cases

- IF the cart holds a pack id and the pack page of that id is opened THEN the page SHALL show "No carrinho" even if the pack was added from another tab.
- WHEN the visitor removes an item THEN the remaining items SHALL keep their relative order.
- IF the cart holds the same id twice because the storage was edited by hand THEN the system SHALL treat it as one item.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAR-01 | P1: Cart storage | Specify | Pending |
| CAR-02 | P1: Cart storage | Specify | Pending |
| CAR-03 | P1: Cart storage | Specify | Pending |
| CAR-04 | P1: Cart storage | Specify | Pending |
| ADD-01 | P1: Add to cart on the pack page | Specify | Pending |
| ADD-02 | P1: Add to cart on the pack page | Specify | Pending |
| ADD-03 | P1: Add to cart on the pack page | Specify | Pending |
| ADD-04 | P1: Add to cart on the pack page | Specify | Pending |
| ADD-05 | P1: Add to cart on the pack page | Specify | Pending |
| HDR-01 | P1: Cart link in the header | Specify | Pending |
| HDR-02 | P1: Cart link in the header | Specify | Pending |
| HDR-03 | P1: Cart link in the header | Specify | Pending |
| HDR-04 | P1: Cart link in the header | Specify | Pending |
| HDR-05 | P1: Cart link in the header | Specify | Pending |
| PAGC-01 | P1: Cart page | Specify | Pending |
| PAGC-02 | P1: Cart page | Specify | Pending |
| PAGC-03 | P1: Cart page | Specify | Pending |
| PAGC-04 | P1: Cart page | Specify | Pending |
| PAGC-05 | P1: Cart page | Specify | Pending |
| PAGC-06 | P1: Cart page | Specify | Pending |
| PAGC-07 | P1: Cart page | Specify | Pending |
| PAGC-08 | P1: Cart page | Specify | Pending |
| REG-01 | P1: Existing behaviour preserved | Specify | Pending |
| REG-02 | P1: Existing behaviour preserved | Specify | Pending |
| EDGE-01 | Edge cases | Specify | Pending |
| EDGE-02 | Edge cases | Specify | Pending |
| EDGE-03 | Edge cases | Specify | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`. `REG-*` and `EDGE-*` are scoped to this feature.

**Status values:** Pending -> In Design -> In Tasks -> Implementing -> Verified

**Coverage:** 27 total, 0 mapped to tasks, 27 unmapped (tasks not written yet)

---

## Success Criteria

- [ ] From any pack page, a visitor adds the pack and sees "Carrinho (1)" without leaving the page.
- [ ] The cart page total always equals the sum of the listed prices from the API.
- [ ] No sequence of clicks puts the same pack in the cart twice.
- [ ] The full Playwright suite passes.
