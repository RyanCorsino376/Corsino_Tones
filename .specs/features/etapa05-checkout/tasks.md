# Checkout and Order - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa05-checkout/spec.md`
**Design**: `.specs/features/etapa05-checkout/design.md`
**Status**: Draft

### Verifier speed and ports

Each mutant runs only against the spec files covering the mutated module. The dev servers the user keeps open on 3000/8080 are stopped before the Verifier and restarted after it.

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: none; strong defaults applied. Style follows `tests/*.spec.js` (Playwright, Portuguese test names, requirement IDs in comments; service modules imported inside a page).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Mock data and API (`mock/db.seed.json`, `frontend/api/pedidos.js`) | e2e | `POST /pedidos` accepted and returned | `tests/pagamento.spec.js` | `npx playwright test` |
| Service (`frontend/servicos/pagamento.js`) | e2e (module in page) | All branches of every field rule (boundaries), approve/decline, 1500 ms | `tests/pagamento.spec.js` | `npx playwright test` |
| UI (`frontend/ui/aviso-login.js`) | e2e | `voltarPara` and the default kept | `tests/checkout.spec.js`, `tests/cabecalho.spec.js` | `npx playwright test` |
| Pages (`frontend/paginas/carrinho.js`, `frontend/paginas/checkout.js`, HTML) | e2e | 1:1 to CK, ACC, RES, FORM, PAY, PED, OK, EDGE: happy + edge + error | `tests/checkout.spec.js` | `npx playwright test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `npx playwright test tests/<files of the task>` |
| Full | Before every commit | `npx playwright test` |
| Build | After the last task | `npx playwright test` |

Baseline before T1: **272 passing**.

---

## Execution Plan

### Phase 1: Services

```
T1 -> T2
```

### Phase 2: Checkout page

```
T3 -> T4 -> T5
```

---

## Task Breakdown

### T1: Orders API and payment service

**What**: Add `pedidos` to the seed, `criarPedido` (`POST /pedidos`), and `servicos/pagamento.js` with the four field rules and the simulated payment.
**Where**: `frontend/servicos/pagamento.js` (new); also `frontend/api/pedidos.js` (new), `mock/db.seed.json`, `tests/pagamento.spec.js` (new)
**Depends on**: None
**Reuses**: `requisicao`; `criarUsuario` pattern
**Requirement**: FORM-02 .. FORM-05 (rules), PAY-01, PAY-03 (rule), EDGE-02, EDGE-03, PED-01 (request)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `criarPedido({...})` sends `POST /pedidos` as JSON and resolves with the record plus a numeric `id`; `GET /pedidos?usuarioId=1` returns it -> `tests/pagamento.spec.js`
- [x] Number: accepts `4111111111111111` and `4111 1111 1111 1111`; rejects 15 and 17 digits and letters, with the spec message
- [x] Name: rejects `''`, `'  '`, `'R'`; accepts `'Ry'`
- [x] Expiry (with a fixed `hoje` of 2026-11-15): accepts `11/26` and `01/27`; rejects `10/26`, `13/27`, `00/27`, `1/27`, `11-26`
- [x] CVV: accepts `123`; rejects `12`, `1234`, `12a`
- [x] `processarPagamento` resolves for `...1111` and rejects with `PagamentoRecusado` for `...0000`, both after 1500 ms and not at 1499 ms (`page.clock`)
- [x] `npm run api:reset` restores an empty `pedidos`
- [x] Full gate passes; test count reported

**Tests**: e2e (`tests/pagamento.spec.js`)
**Gate**: full
**Commit**: `feat(payment): add the orders API and a simulated card payment`

**Status**: Complete

Test count: 281 (272 + 9). The running dev json-server reloaded the reset `db.json` with the empty `pedidos` collection (it watches the file).

---

### T2: "Finalizar compra" and a configurable "Voltar" on the login pop-up

**What**: Add "Finalizar compra" to the cart list and let `pedirLogin` take `voltarPara` (default `index.html`).
**Where**: `frontend/ui/aviso-login.js`; also `frontend/carrinho.html`, `frontend/style.css`, `tests/checkout.spec.js` (new)
**Depends on**: T1
**Reuses**: `.botao-tentar`; the pop-up of slice 2
**Requirement**: CK-01, CK-02, REG-01 (library "Voltar")

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] With packs, the cart page shows "Finalizar compra" → `checkout.html`; after removing the last pack it is gone; in the loading and error states it is not shown -> `tests/checkout.spec.js`
- [x] The library pop-up "Voltar" still goes to `index.html` (existing `tests/cabecalho.spec.js` passes unchanged)
- [x] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(cart): add the Finalizar compra link`

**Status**: Complete

Test count: 283 (281 + 2). The absence test first passed before the code (lesson L-001); it now also requires the hidden link to exist. A first full run had two timeouts in `sessao.spec.js` (untouched by this task) under load average 6.9; both passed in isolation twice and the full rerun passed.

---

### T3: Checkout page: session and summary

**What**: Create `checkout.html` and `paginas/checkout.js` up to the summary: login pop-up with "Voltar" to the cart, empty state, summary with prices and total, unknown-pack notice, loading and error.
**Where**: `frontend/paginas/checkout.js` (new); also `frontend/checkout.html` (new), `frontend/style.css`, `tests/checkout.spec.js`
**Depends on**: T2
**Reuses**: `pedirLogin`, cart join of `paginas/carrinho.js`, `carregarComEstado`
**Requirement**: ACC-01 .. ACC-04, RES-01 .. RES-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Signed out: pop-up "Faça login para finalizar a compra", no form, no request, URL unchanged after 60 s of fake clock and no `meta refresh` (lessons L-009/L-010); "Fazer login" → `login.html?voltar=checkout.html`; "Voltar" and Esc → `carrinho.html`; signing in lands on `checkout.html` with the cart intact -> `tests/checkout.spec.js`
- [ ] Signed in, two packs: `GET /packs`, both listed in cart order with prices, "Total: R$ 99,80"; the form is visible with "Pagar R$ 99,80"
- [ ] Empty cart: empty state, no form, no request
- [ ] Unknown pack id: removed with the notice
- [ ] Held request: "Carregando carrinho...", no form; aborted: error + retry, no form
- [ ] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(checkout): add the checkout page with login and summary`

---

### T4: Card form validation

**What**: Validate the four fields on submit with the spec messages, `aria-invalid`, `aria-describedby`, focus on the first error, and live clearing.
**Where**: `frontend/paginas/checkout.js`; also `frontend/checkout.html`, `tests/checkout.spec.js`
**Depends on**: T3
**Reuses**: `validarCampoCartao` (T1); field-message pattern of `paginas/login.js`
**Requirement**: FORM-01, FORM-06, FORM-07 (FORM-02..05 on the page)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The four labelled fields exist and the button reads "Pagar R$ 99,80" -> `tests/checkout.spec.js`
- [ ] Submitting "4111", "R", "13/20", "12" shows the four spec messages, each linked by `aria-describedby`, `aria-invalid="true"`, focus on the number, and no payment started (button keeps its text)
- [ ] Fixing the number removes only its message while typing
- [ ] A second invalid submit does not duplicate messages
- [ ] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(checkout): validate the card form`

---

### T5: Payment, order and confirmation

**What**: On a valid submit: pending button, simulated payment, decline message, `POST /pedidos`, order-failure message, cart emptied, confirmation.
**Where**: `frontend/paginas/checkout.js`; also `frontend/checkout.html`, `frontend/style.css`, `tests/checkout.spec.js`
**Depends on**: T4
**Reuses**: `processarPagamento`, `criarPedido`, `esvaziarCarrinho`, `atualizarContadorCarrinho`, form alert of `paginas/login.js`
**Requirement**: PAY-01 .. PAY-04, PED-01 .. PED-03, OK-01 .. OK-04, EDGE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Valid card: button disabled with "Processando pagamento..."; then exactly one `POST /pedidos` whose body is exactly `{ usuarioId: 1, packIds: [...cart order], totalCentavos: <sum>, status: 'pago', criadoEm: <ISO> }`; confirmation "Compra aprovada!", "Pedido nº {id from the response}", the packs, the total, "Ir para a biblioteca" → `biblioteca.html`; header "Carrinho (0)"; `corsino:carrinho` empty -> `tests/checkout.spec.js`
- [ ] No request during the purchase contains the card number, name, expiry or CVV; nothing card-related in `localStorage`/`sessionStorage`
- [ ] Card ending in 0000: decline message in `role="alert"`, no request to the API after the summary, cart and values kept, button back to "Pagar ..."
- [ ] `POST /pedidos` aborted: order-failure message, cart and values kept, button back; a retry with a working route creates one order
- [ ] Double-click on "Pagar": one `POST /pedidos`
- [ ] Reload after the confirmation: empty-cart state, no new order
- [ ] Full gate passes; test count reported

**Tests**: e2e
**Gate**: full
**Commit**: `feat(checkout): pay, record the order and confirm the purchase`

---

## Phase Execution Map

```
Phase 1 -> Phase 2

T1 -> T2 -> T3 -> T4 -> T5
```

Five tasks fit one batch, so execution runs inline. The Verifier runs automatically after T5.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | One service + one API function + seed | Granular (cohesive: the order and its payment) |
| T2 | One link + one option on the pop-up | Granular |
| T3 | One new page up to its summary | Granular |
| T4 | Form validation | Granular |
| T5 | Submit flow | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 (phase boundary) | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T4 | T4 -> T5 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Mock data, API, service | e2e | e2e | ✅ OK |
| T2 | UI, page, markup | e2e | e2e | ✅ OK |
| T3 | Page, markup, styles | e2e | e2e | ✅ OK |
| T4 | Page | e2e | e2e | ✅ OK |
| T5 | Page, markup, styles | e2e | e2e | ✅ OK |

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| FORM-02 .. FORM-05, EDGE-02, EDGE-03 | T1 (rules), T4 (page) |
| PAY-01, PAY-03, PED-01 | T1 (service/request), T5 (page) |
| CK-01, CK-02, REG-01 | T2 |
| ACC-01 .. ACC-04, RES-01 .. RES-05 | T3 |
| FORM-01, FORM-06, FORM-07 | T4 |
| PAY-02, PAY-04, PED-02, PED-03, OK-01 .. OK-04, EDGE-01 | T5 |

**Coverage:** 33 requirements, 33 mapped to tasks, 0 unmapped.
