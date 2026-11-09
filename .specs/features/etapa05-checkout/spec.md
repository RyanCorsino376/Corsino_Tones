# Checkout and Order - Specification

Slice 5 of `.specs/features/etapa05-loja/plano.md`.

## Problem Statement

A visitor can fill a cart (slice 4) but cannot buy it. The plan's flow continues cart → `checkout.html` (simulated payment) → order approved. This slice adds "Finalizar compra" to the cart, a checkout page that requires a session, a simulated card form, the order sent to the server as `POST /pedidos` when the payment is approved, and a confirmation screen. A declined payment keeps the cart and records nothing (plan R5).

## Goals

- [ ] A signed-in visitor can pay for the cart with a test card and see "Compra aprovada!" with the order number; the order exists in `GET /pedidos` and the cart is empty.
- [ ] A card ending in 0000 is declined: the visitor sees why, the cart is kept and no order is recorded.
- [ ] No card data ever leaves the browser.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Showing bought packs and downloads in the library | Slice 6 |
| Blocking a pack already bought (R2, "Na biblioteca") | Slice 6 reads the orders this slice creates |
| A real payment gateway, card tokenisation, webhooks | The store is simulated; the plan's security note describes the real flow with Spring Boot |
| Recording declined payments | User choice: only approved purchases become orders |
| Order history page, cancellations, refunds | Not in the store plan |
| PIX, boleto or other payment methods | Plan decision: card only (2026-11-05) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| How the visitor pays | A card form (number, name, expiry, CVV) validated in the browser; a card whose number ends in `0000` is declined, any other valid card is approved | User choice; it exercises validation, waiting and error handling | y |
| Declined payment | Nothing is recorded on the server | User choice | y |
| After approval | A confirmation on the checkout page: "Compra aprovada!", the order number, the packs, the total and a link "Ir para a biblioteca"; the cart is emptied | User choice | y |
| Signed-out checkout | `checkout.html` opens the slice 2 pop-up with "Faça login para finalizar a compra"; "Fazer login" goes to `login.html?voltar=checkout.html`; "Voltar" (and Esc) go to `carrinho.html` | User choice; back to the cart, not the home page, because the visitor was buying | y |
| Card data | Never sent anywhere and never stored: the order carries no card field, not even the last digits | A simulated store has no reason to touch card data; avoids building a habit that is unsafe in a real one | n |
| "Finalizar compra" | A link to `checkout.html` on the cart page, shown only while the cart list is shown | The checkout needs something to pay for | n |
| Prices at checkout | Read again from `GET /packs` when the checkout opens; the order's total is that sum, in integer cents | Prices are never trusted from the browser (slice 4 decision) | n |
| Unknown or empty cart at checkout | Same rules as the cart page: unknown packs are removed with the slice 4 notice; an empty cart shows "Seu carrinho está vazio." and "Ver os packs", and no form | One rule for both pages | n |
| Field rules | Number: 16 digits once spaces are removed. Name: at least 2 characters after trimming. Expiry: `MM/AA`, month 01-12, not before the current month. CVV: exactly 3 digits | Common card format; "not before the current month" uses the browser's date | n |
| Field messages | Number: "Informe os 16 dígitos do cartão." · Name: "Informe o nome como está no cartão." · Expiry: "Informe uma validade futura no formato MM/AA." · CVV: "Informe os 3 dígitos do código de segurança." | Fixed wording; same field-message pattern as etapa04 (`aria-invalid`, `aria-describedby`, focus on the first error) | n |
| Pay button | "Pagar {total}"; while pending, disabled with "Processando pagamento..." | Shows what will be charged; the pending state blocks double payment | n |
| Simulated payment | `servicos/pagamento.js` waits 1500 ms, then approves or declines by the card rule | A visible wait for the stage's loading requirement; fixed rule makes tests reproducible | n |
| Order | `POST /pedidos` with `{ usuarioId, packIds, totalCentavos, status: "pago", criadoEm }`; `packIds` in cart order; `criadoEm` an ISO date-time; the server adds `id` | Plan section 4 (revision: `packIds`); the library of slice 6 reads `status: "pago"` orders | n |
| Messages | Declined: "Pagamento recusado. Verifique os dados do cartão ou use outro cartão." · Order failed: "Não foi possível concluir a compra. Verifique sua conexão e tente novamente." · Both in a `role="alert"` element in the form | Fixed wording; the visitor knows whether to fix the card or retry | n |
| After a failure | The cart and the typed values are kept; the button is enabled again | The visitor can correct and retry without retyping | n |
| Mock data | `mock/db.seed.json` gains `"pedidos": []` | json-server needs the collection to accept `POST /pedidos` | n |
| Spec language | English | `validate_spec.py` matches EARS keywords in English | y |

**Implicit-requirement sweep:**
- Input validation: the four card fields (FORM-*).
- Failure states: declined payment (PAY-03), order request failure (PED-03), communication failure loading prices (RES-04).
- Idempotency / duplicates: the pay button is disabled while pending (PAY-02); the cart is emptied only after the order is recorded (PED-02), so a retry after a failure cannot create two orders for one click.
- Auth boundaries: checkout requires a session (ACC-*); the order carries the signed-in `usuarioId` (PED-01).
- State transitions: form → processing → approved (confirmation) or back to the form with an error (PAY-*, OK-*).
- Data lifecycle: the cart is emptied on approval (OK-03); declined payments leave no record (PAY-03).
- Concurrency: two tabs paying the same cart could create two orders. N/A because the mock has no server logic; noted for Spring Boot.
- Observability: request failures are logged by `api/cliente.js`. Rate limits: N/A (no server logic).

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: From the cart to the checkout ⭐ MVP

**User Story**: As a visitor with packs in the cart, I want a clear way to start paying.

**Why P1**: Without it the checkout cannot be reached.

**Acceptance Criteria**

1. WHILE the cart page shows its list, the system SHALL show a link "Finalizar compra" to `checkout.html`.
2. WHILE the cart page shows the empty state, the loading state or the error state, the system SHALL NOT show "Finalizar compra".

**Independent Test**: Add a pack, open the cart; "Finalizar compra" leads to `checkout.html`. Remove the pack; the link disappears.

---

### P1: Checkout requires a session ⭐ MVP

**User Story**: As the store, I want only signed-in visitors to pay so that every order belongs to an account.

**Why P1**: The library of slice 6 lists orders by user.

**Acceptance Criteria**

1. WHEN `checkout.html` loads without a session THEN the system SHALL open a modal dialog "Faça login para finalizar a compra" with "Fazer login" and "Voltar", SHALL show no payment form, SHALL send no request, and SHALL NOT change the location by itself.
2. WHEN the visitor activates "Fazer login" THEN the system SHALL go to `login.html?voltar=checkout.html`.
3. WHEN the visitor activates "Voltar" or presses Esc THEN the system SHALL go to `carrinho.html`.
4. WHEN a visitor signs in from that login page THEN the system SHALL land on `checkout.html` with the cart unchanged.

**Independent Test**: Signed out with one pack in the cart, open the checkout; the pop-up shows. "Fazer login", sign in; the checkout opens with the pack.

---

### P1: Order summary ⭐ MVP

**User Story**: As a buyer, I want to see what I am paying for before I pay.

**Why P1**: The total on the pay button comes from here.

**Acceptance Criteria**

1. WHEN `checkout.html` loads with a session and a non-empty cart THEN the system SHALL request `GET /packs` and list the cart packs, in cart order, with name and formatted price, and show "Total: {formatted sum}".
2. IF the cart is empty THEN the system SHALL show "Seu carrinho está vazio." and "Ver os packs" to `packs.html`, SHALL show no payment form and SHALL send no request.
3. IF a cart pack has no pack in the API THEN the system SHALL remove it from the cart and show "Um pack do seu carrinho não está mais disponível e foi removido.".
4. IF the request fails to communicate THEN the system SHALL show "Não foi possível carregar o carrinho. Verifique sua conexão e tente novamente." with "Tentar novamente", and SHALL show no payment form.
5. WHILE the request is pending, the system SHALL show "Carregando carrinho..." and no payment form.

**Independent Test**: Signed in with two packs, open the checkout; both are listed with "Total: R$ 99,80".

---

### P1: Card form validation ⭐ MVP

**User Story**: As a buyer, I want to be told what is wrong with my card data before anything is processed.

**Why P1**: The stage requires handling invalid input; a bad card must never reach the payment step.

**Acceptance Criteria**

1. The payment form SHALL have the fields "Número do cartão", "Nome no cartão", "Validade (MM/AA)" and "CVV", and a submit button "Pagar {total}".
2. IF the number does not have 16 digits once spaces are removed THEN the system SHALL show "Informe os 16 dígitos do cartão." next to it.
3. IF the name has fewer than 2 characters after trimming THEN the system SHALL show "Informe o nome como está no cartão." next to it.
4. IF the expiry is not `MM/AA` with a month from 01 to 12, or is before the current month THEN the system SHALL show "Informe uma validade futura no formato MM/AA." next to it.
5. IF the CVV is not exactly 3 digits THEN the system SHALL show "Informe os 3 dígitos do código de segurança." next to it.
6. IF any field is rejected THEN the system SHALL mark it `aria-invalid="true"`, link its message through `aria-describedby`, move focus to the first rejected field, and SHALL NOT start the payment.
7. WHEN a rejected field is edited into a valid value THEN the system SHALL remove its message and `aria-invalid` without a new submit.

**Independent Test**: Submit "4111", "R", "13/20", "12"; four messages show and focus is on the number.

---

### P1: Simulated payment ⭐ MVP

**User Story**: As a buyer, I want to see that my payment is being processed and whether it went through.

**Why P1**: It is the stage's loading, success and error handling for the purchase.

**Acceptance Criteria**

1. WHEN a valid form is submitted THEN the system SHALL process the payment for 1500 ms before deciding.
2. WHILE the payment or the order request is pending, the system SHALL disable the pay button and show "Processando pagamento..." on it.
3. IF the card number ends in `0000` THEN the system SHALL decline: show "Pagamento recusado. Verifique os dados do cartão ou use outro cartão." in a `role="alert"` element, keep the cart and the typed values, re-enable the button with "Pagar {total}", and SHALL NOT send any request to the server.
4. The system SHALL NOT send the card number, name, expiry or CVV in any request, nor store them in the browser.

**Independent Test**: Pay with a card ending in 0000; after "Processando pagamento..." the decline message shows and `GET /pedidos` has no new order.

---

### P1: Order recorded on the server ⭐ MVP

**User Story**: As the store, I want every approved payment to become an order so that the buyer gets the packs.

**Why P1**: It is the "operation submitted to the server" of the purchase, and the library depends on it.

**Acceptance Criteria**

1. WHEN the payment is approved THEN the system SHALL send `POST /pedidos` with `usuarioId` of the session, `packIds` in cart order, `totalCentavos` equal to the summary total, `status` `"pago"` and `criadoEm` as an ISO date-time, and no other field.
2. The system SHALL empty the cart only after `POST /pedidos` succeeds.
3. IF `POST /pedidos` fails THEN the system SHALL show "Não foi possível concluir a compra. Verifique sua conexão e tente novamente." in a `role="alert"` element, keep the cart and the typed values, and re-enable the button.

**Independent Test**: Pay with a valid card; `GET /pedidos?usuarioId=1` returns one more order with the two pack ids and the total.

---

### P1: Purchase confirmation ⭐ MVP

**User Story**: As a buyer, I want a clear confirmation of what I bought.

**Why P1**: It closes the purchase and leads to the library.

**Acceptance Criteria**

1. WHEN the order is recorded THEN the system SHALL replace the form and the summary with "Compra aprovada!", "Pedido nº {id}", the bought packs with their prices, the total and a link "Ir para a biblioteca" to `biblioteca.html`.
2. WHEN the confirmation shows THEN the header SHALL read "Carrinho (0)".
3. WHEN the order is recorded THEN `corsino:carrinho` SHALL be empty.
4. WHEN the visitor reloads the page after the confirmation THEN the system SHALL show the empty-cart state and SHALL NOT create another order.

**Independent Test**: After approval, "Compra aprovada!" and "Pedido nº 1" (or the next id) show; reload; "Seu carrinho está vazio.".

---

### P1: Existing behaviour preserved ⭐ MVP

**User Story**: As the developer, I want everything delivered so far to keep working.

**Why P1**: The pop-up, the header and the cart are shared.

**Acceptance Criteria**

1. The system SHALL keep every criterion of slices 1 to 4 satisfied, including the library pop-up going back to `index.html` on "Voltar".

**Independent Test**: The whole Playwright suite passes.

---

## Edge Cases

- IF the visitor double-clicks "Pagar" THEN the system SHALL process one payment and send at most one `POST /pedidos`.
- IF the expiry is the current month THEN the system SHALL accept it.
- IF the card number is typed with spaces ("4111 1111 1111 1111") THEN the system SHALL accept it.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CK-01 | P1: From the cart to the checkout | Tasks | Implementing |
| CK-02 | P1: From the cart to the checkout | Tasks | Implementing |
| ACC-01 | P1: Checkout requires a session | Specify | Pending |
| ACC-02 | P1: Checkout requires a session | Specify | Pending |
| ACC-03 | P1: Checkout requires a session | Specify | Pending |
| ACC-04 | P1: Checkout requires a session | Specify | Pending |
| RES-01 | P1: Order summary | Specify | Pending |
| RES-02 | P1: Order summary | Specify | Pending |
| RES-03 | P1: Order summary | Specify | Pending |
| RES-04 | P1: Order summary | Specify | Pending |
| RES-05 | P1: Order summary | Specify | Pending |
| FORM-01 | P1: Card form validation | Specify | Pending |
| FORM-02 | P1: Card form validation | Specify | Pending |
| FORM-03 | P1: Card form validation | Specify | Pending |
| FORM-04 | P1: Card form validation | Specify | Pending |
| FORM-05 | P1: Card form validation | Specify | Pending |
| FORM-06 | P1: Card form validation | Specify | Pending |
| FORM-07 | P1: Card form validation | Specify | Pending |
| PAY-01 | P1: Simulated payment | Specify | Pending |
| PAY-02 | P1: Simulated payment | Specify | Pending |
| PAY-03 | P1: Simulated payment | Specify | Pending |
| PAY-04 | P1: Simulated payment | Specify | Pending |
| PED-01 | P1: Order recorded on the server | Specify | Pending |
| PED-02 | P1: Order recorded on the server | Specify | Pending |
| PED-03 | P1: Order recorded on the server | Specify | Pending |
| OK-01 | P1: Purchase confirmation | Specify | Pending |
| OK-02 | P1: Purchase confirmation | Specify | Pending |
| OK-03 | P1: Purchase confirmation | Specify | Pending |
| OK-04 | P1: Purchase confirmation | Specify | Pending |
| REG-01 | P1: Existing behaviour preserved | Specify | Pending |
| EDGE-01 | Edge cases | Specify | Pending |
| EDGE-02 | Edge cases | Tasks | Implementing |
| EDGE-03 | Edge cases | Tasks | Implementing |

**ID format:** `[CATEGORY]-[NUMBER]`. `REG-*` and `EDGE-*` are scoped to this feature.

**Status values:** Pending -> In Design -> In Tasks -> Implementing -> Verified

**Coverage:** 33 total, 0 mapped to tasks, 33 unmapped (tasks not written yet)

---

## Success Criteria

- [ ] An approved purchase creates exactly one order with the right packs and total, and empties the cart.
- [ ] A declined purchase or a failed order request leaves the cart and the server unchanged.
- [ ] No request ever carries card data.
- [ ] The full Playwright suite passes.
