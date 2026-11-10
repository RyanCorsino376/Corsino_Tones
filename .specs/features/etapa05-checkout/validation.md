# Checkout and Order (etapa05-checkout) Validation

**Date**: 2026-11-09
**Spec**: `.specs/features/etapa05-checkout/spec.md`
**Diff range**: `147a26d..99b3c60` (5 implementation commits on `feat/etapa05-loja`)
**Verifier**: independent sub-agent (author ≠ verifier), iteration 1 of 3

**Verdict**: FAIL

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `cefde13` |
| T2 | ✅ Done | `83b7d83` |
| T3 | ✅ Done | `b7d0caa` |
| T4 | ✅ Done | `ca83924` |
| T5 | ⚠️ Done, tests weak | `99b3c60`. Production code matches the spec in every place the Verifier read; 7 sensor survivors are test-strength gaps (see Discrimination Sensor) |

---

## Spec-Anchored Acceptance Criteria

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| CK-01 | Link "Finalizar compra" → `checkout.html` while the list shows | `tests/checkout.spec.js:28-29` - `toBeVisible()`, `toHaveAttribute('href','checkout.html')` | ✅ PASS |
| CK-02 | No link in empty, loading, error states | `tests/checkout.spec.js:33` (empty, after the link was visible), `:45-46` (`toHaveCount(1)` then `toBeHidden()` while loading), `:49` (error) | ✅ PASS |
| ACC-01 | Modal dialog with the text, no form, no request, no self-navigation | `tests/checkout.spec.js:71-80` - `toContainText('Faça login para finalizar a compra')`, `:modal` true, form `toHaveCount(1)`+`toBeHidden()`, URL after 60 s fake clock, no meta refresh, `pedidos` `toEqual([])` | ✅ PASS |
| ACC-02 | `login.html?voltar=checkout.html` | `tests/checkout.spec.js:88` - `toHaveURL(/login\.html\?voltar=checkout\.html$/)` | ✅ PASS |
| ACC-03 | "Voltar" and Esc → `carrinho.html` | `tests/checkout.spec.js:92-102` - `toHaveURL(/carrinho\.html$/)` for both | ✅ PASS |
| ACC-04 | Lands on `checkout.html`, cart unchanged | `tests/checkout.spec.js:114-116` - URL, 2 items, storage `'["rock-zoom-g6","clean-nux-mg-30"]'` | ✅ PASS |
| RES-01 | `GET /packs`; packs in cart order with name and formatted price; "Total: {sum}" | `tests/checkout.spec.js:125-138` - per-index name + `.item-preco` `toHaveText(formatoBRL(...))`, total | ⚠️ PASS with weak data: every seed pack costs 4990, so per-item price and sum sources are not discriminated (M23, M15 survived) |
| RES-02 | Empty text, "Ver os packs" → `packs.html`, no form, no request | `tests/checkout.spec.js:147-152` | ✅ PASS |
| RES-03 | Unknown pack removed + exact notice | `tests/checkout.spec.js:159-161` - exact text, 1 item, storage `'["rock-zoom-g6"]'` | ✅ PASS |
| RES-04 | Exact error text, "Tentar novamente", no form | `tests/checkout.spec.js:188-191` | ✅ PASS |
| RES-05 | "Carregando carrinho..." and no form while pending | `tests/checkout.spec.js:171-175` | ✅ PASS |
| FORM-01 | Four labelled fields + "Pagar {total}" | `tests/checkout.spec.js:227-228` - `getByLabel(rotulo,{exact:true}).toBeVisible()`, button text | ✅ PASS |
| FORM-02 | 16 digits once spaces removed; exact message | `tests/pagamento.spec.js:31-35`, `tests/checkout.spec.js:239-241` | ✅ PASS |
| FORM-03 | ≥ 2 chars after trim; exact message | `tests/pagamento.spec.js:40-43` (incl. `' R '`) | ✅ PASS |
| FORM-04 | `MM/AA`, month 01-12, not before current month | `tests/pagamento.spec.js:48-51` - accepts `11/26` (current), rejects `10/26`, `13/27`, `00/27` ... with fixed `hoje` | ✅ PASS |
| FORM-05 | Exactly 3 digits | `tests/pagamento.spec.js:56-57` - rejects `12`, `1234`, `12a` | ✅ PASS |
| FORM-06 | `aria-invalid`, `aria-describedby` → message, focus first rejected, no payment | `tests/checkout.spec.js:239-245`, `:253-255` (focus on validade, not numero), `:277` (no duplicates) | ✅ PASS |
| FORM-07 | Editing to valid removes message and `aria-invalid` without submit | `tests/checkout.spec.js:266-268` | ✅ PASS |
| PAY-01 | Decision at 1500 ms, not before | `tests/pagamento.spec.js:77-80` - `'pendente'` at 1499 ms, decided at 1501 ms | ✅ PASS |
| PAY-02 | Disabled + "Processando pagamento..." while pending | `tests/checkout.spec.js:312-313` | ✅ PASS |
| PAY-03 | Exact decline text in `role="alert"`, cart/values kept, button back, no request | `tests/checkout.spec.js:357-363` - alert `toHaveText(RECUSADO)`, `requisicoes` `toEqual([])`, storage, values, button text | ✅ PASS |
| PAY-04 | No card field in any request, nothing stored | `tests/checkout.spec.js:337-345`, `tests/pagamento.spec.js:93` | ✅ PASS |
| PED-01 | `POST /pedidos` with session `usuarioId`, `packIds` in cart order, `totalCentavos` = summary total, `status:"pago"`, ISO `criadoEm`, no other field | `tests/checkout.spec.js:317-321` - exact key set; `toMatchObject({ usuarioId: 1, packIds: carrinho, totalCentavos, status: 'pago' })` | ❌ GAP: `usuarioId` only ever 1 (M11 survived); cart `['clean-nux-mg-30','rock-zoom-g6']` is already sorted, so "cart order" is not distinguished from sorted (M12 survived); `totalCentavos` equals any 4990×n formula (M14, M15 survived) |
| PED-02 | Cart emptied only after `POST` succeeds | `tests/checkout.spec.js:380` - storage kept after aborted POST | ✅ PASS (M08 killed) |
| PED-03 | Exact failure text in `role="alert"`, cart/values kept, button back | `tests/checkout.spec.js:379-383` | ✅ PASS |
| OK-01 | "Compra aprovada!", "Pedido nº {id}", packs **with their prices**, total, "Ir para a biblioteca" → `biblioteca.html`; form + summary replaced | `tests/checkout.spec.js:325-331` - heading, `toContainText('Pedido nº ${pedidoCriado.id}')`, names only, total, link | ❌ GAP: prices in the confirmation list not asserted (M24 survived); order id is 1 in an isolated run, so a fixed "Pedido nº 1" passes (M18 survived) |
| OK-02 | Header "Carrinho (0)" | `tests/checkout.spec.js:333` | ✅ PASS |
| OK-03 | `corsino:carrinho` empty | `tests/checkout.spec.js:334` - `toBeNull()` | ⚠️ Spec-precision gap (minor): "empty" does not say absent key vs `[]`; test pins the implementation's choice (key removed) |
| OK-04 | Reload → empty state, no new order | `tests/checkout.spec.js:408-411` | ✅ PASS |
| REG-01 | Slices 1-4 kept; library "Voltar" → `index.html` | `tests/cabecalho.spec.js:108-112`, `:115` + full gate | ✅ PASS (M20 killed) |
| EDGE-01 | Double click → one payment, ≤ 1 POST | `tests/checkout.spec.js:395-397` | ✅ PASS (M16 killed) |
| EDGE-02 | Current-month expiry accepted | `tests/pagamento.spec.js:48` (`11/26` with `hoje` 2026-11-15) | ✅ PASS (M01 killed) |
| EDGE-03 | Number with spaces accepted | `tests/pagamento.spec.js:32`, used end-to-end by `CARTAO_OK` | ✅ PASS (M03 killed) |

**Status**: ❌ Gaps present (PED-01, OK-01; RES-01 weak data) · 1 minor spec-precision gap (OK-03)

---

## Discrimination Sensor

Scratch: `git worktree add` under the session scratchpad, `node_modules` symlinked, `node mock/preparar.js --reset` before each mutant, `CI=1`. Each mutant ran only the spec files covering the mutated module. Baseline in the worktree: 67/67 passed (pagamento, checkout, cabecalho, api-mock).

| # | File:line | Description | Specs run | Killed? |
| - | --------- | ----------- | --------- | ------- |
| M01 | `frontend/servicos/pagamento.js:35` | Expiry `>=` → `>` (rejects current month) | pagamento, checkout | ✅ `pagamento.spec.js:47` |
| M02 | `frontend/servicos/pagamento.js:35` | Expiry accepts the previous month | pagamento, checkout | ✅ `pagamento.spec.js:47` |
| M03 | `frontend/servicos/pagamento.js:27` | Number rule does not strip spaces | pagamento, checkout | ✅ 8 tests |
| M04 | `frontend/servicos/pagamento.js:37` | CVV `\d{3}` → `\d{3,4}` | pagamento, checkout | ✅ `pagamento.spec.js:55` |
| M05 | `frontend/servicos/pagamento.js:51` | Decide at 1000 ms | pagamento, checkout | ✅ `pagamento.spec.js:64` ×2 |
| M06 | `frontend/servicos/pagamento.js:49` | `endsWith('0000')` → `startsWith` | pagamento, checkout | ✅ 2 tests |
| M07 | `frontend/paginas/checkout.js:175` | Last 4 card digits added to the order body | checkout | ✅ `checkout.spec.js:300` |
| M08 | `frontend/paginas/checkout.js:171` | Cart emptied before `POST /pedidos` | checkout | ✅ `checkout.spec.js:367` |
| M09 | `frontend/paginas/checkout.js:183` | Cart emptied on decline | checkout | ✅ `checkout.spec.js:349` |
| M10 | `frontend/paginas/checkout.js:183` | Order sent on decline | checkout | ✅ `checkout.spec.js:349` |
| M11 | `frontend/paginas/checkout.js:172` | `usuarioId: usuarioAtual().id` → `1` | checkout | ❌ Survived |
| M12 | `frontend/paginas/checkout.js:173` | `packIds` sorted | checkout | ❌ Survived |
| M13 | `frontend/paginas/checkout.js:173` | `packIds` reversed | checkout | ✅ `checkout.spec.js:300` |
| M14 | `frontend/paginas/checkout.js:174` | `totalCentavos` = first item price × count | checkout | ❌ Survived |
| M15 | `frontend/paginas/checkout.js:48` | Summary total = count × 4990 | checkout | ❌ Survived |
| M16 | `frontend/paginas/checkout.js:166` | Button not disabled while paying | checkout | ✅ 2 tests |
| M17 | `frontend/paginas/checkout.js:167` | Pending text missing | checkout | ✅ `checkout.spec.js:300` |
| M18 | `frontend/paginas/checkout.js:139` | Fixed "Pedido nº 1" | checkout | ❌ Survived (the only order in an isolated run has id 1) |
| M19 | `frontend/paginas/checkout.js:210` | Checkout pop-up "Voltar"/Esc → `index.html` | checkout | ✅ `checkout.spec.js:96` ×2 |
| M20 | `frontend/ui/aviso-login.js:10` | Default `voltarPara` changed (library pop-up) | cabecalho | ✅ `cabecalho.spec.js:108`, `:115` |
| M21 | `frontend/carrinho.html:54` | "Finalizar compra" moved out of the list section | checkout | ✅ 2 tests |
| M22 | `frontend/paginas/checkout.js:213` | Form shown while loading | checkout | ✅ 2 tests |
| M23 | `frontend/paginas/checkout.js:50` | Summary item prices all from the first item | checkout | ❌ Survived |
| M24 | `frontend/paginas/checkout.js:142` | Confirmation list shows names without prices | checkout | ❌ Survived |
| M25 | `frontend/paginas/checkout.js:200` | No live re-validation | checkout | ✅ `checkout.spec.js:259` |
| M26 | `frontend/paginas/checkout.js:179` | Header counter not refreshed after the order | checkout | ✅ `checkout.spec.js:300` |
| M27 | `frontend/paginas/checkout.js:183` | `form.reset()` after a failure | checkout | ✅ 2 tests |
| M28 | `frontend/paginas/checkout.js:124` | Alert without `role="alert"` | checkout | ✅ 2 tests |
| M29 | `frontend/paginas/checkout.js:114` | Focus on first field instead of first error | checkout | ✅ `checkout.spec.js:249` |
| M30 | `frontend/paginas/checkout.js:166` | Card-holder name stored in `sessionStorage` | checkout | ✅ `checkout.spec.js:300` |

**Sensor depth**: P0-full (payment / data integrity), manual fault injection, 30 mutants
**Result**: 23/30 killed, 7 survived - FAIL ❌

Survivors share two root causes: (a) uniform fixture values - every seed pack costs 4990, the only session is user 1, the two-item cart is already in alphabetical order, the only order in an isolated run gets id 1 (lesson L-014 recurs); (b) OK-01's "with their prices" in the confirmation has no assertion.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes (`aviso-login.js` gains one defaulted parameter; `irParaInicio` removed as now unused) | ✅ |
| No scope creep | ✅ (`aviso-teste` hint under the button is a small addition, harmless) |
| Matches patterns (field-message pattern of etapa04, `carregarComEstado`, `requisicao`) | ✅ |
| Spec-anchored outcome check | ❌ PED-01, OK-01 (see above) |
| Per-layer coverage (service boundaries 1:1; page happy + edge + error) | ✅ structure; ❌ data discrimination |
| Every test maps to a spec requirement | ✅ (`pagamento.spec.js:115` seed test maps to the T1 Done-when / mock-data decision) |
| Documented guidelines followed: `.specs/LESSONS.md` (L-001, L-009, L-010 applied; L-014 not applied) | ⚠️ |

---

## Edge Cases

- [x] EDGE-01 double click: one POST (`checkout.spec.js:391`, M16 killed)
- [x] EDGE-02 current month accepted (`pagamento.spec.js:48`, M01 killed)
- [x] EDGE-03 number with spaces accepted (`pagamento.spec.js:32`, M03 killed)

---

## Gate Check

- **Gate command**: `npx playwright test` (Build, from tasks.md), run on the real tree with `CI=1` after `node mock/preparar.js --reset`
- **Result**: 302 passed, 1 failed, 0 skipped in 2.2 min
- **Failure**: `tests/login-api.spec.js:182` (etapa05-auth CAD, out of this diff) - `toHaveURL` timeout of 5 s under load. Re-run in isolation: `tests/login-api.spec.js` 20/20 passed. Treated as a load flake, not a regression.
- **Test count before feature**: 272 (etapa05-carrinho validation)
- **Test count after feature**: 303
- **Delta**: +31 (9 in `pagamento.spec.js`, 22 in `checkout.spec.js`)
- **Skipped tests**: none
- **Assertions weakened**: none found (`cabecalho.spec.js`, `api-mock.spec.js` unchanged in the range)

---

## Fix Plans

### Fix 1: Discriminating data for the order body and the summary (PED-01, RES-01)

- **Root cause**: uniform fixtures - all packs 4990, session always user 1, the two-item cart already sorted.
- **Fix task**: in `tests/checkout.spec.js`, for the valid-card test (`:300`) and RES-01 (`:122`): serve `GET /packs` through `page.route` with distinct prices (e.g. 4990 and 2590), use a cart whose order is not alphabetical (e.g. `['rock-zoom-g6', 'clean-nux-mg-30']`), and a session with a user id other than 1 (a registered user, or a second seed user). Assert per-item prices, the total, and the body's `usuarioId`, `packIds`, `totalCentavos` against those values.
- **Verify**: M11, M12, M14, M15, M23 are killed.
- **Priority**: Major

### Fix 2: Confirmation prices and order number (OK-01)

- **Root cause**: no assertion on confirmation prices; the order id coincides with a constant.
- **Fix task**: assert each confirmation item's `.item-preco` text against its pack price (with the distinct prices of Fix 1); create one order before the test (e.g. `request.post('/pedidos', ...)`) so the id under test is not 1, and assert the exact "Pedido nº {id}" text.
- **Verify**: M18, M24 are killed.
- **Priority**: Major

### Note (spec-precision, minor): OK-03

"`corsino:carrinho` SHALL be empty" - state whether the key is removed or holds `[]`, or make the test accept both.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CK-01..02, ACC-01..04, RES-02..05, FORM-01..07, PAY-01..04, PED-02, PED-03, OK-02, OK-04, REG-01, EDGE-01..03 | Implementing | ✅ Verified |
| RES-01 | Implementing | ❌ Needs Fix (tests) |
| PED-01 | Implementing | ❌ Needs Fix (tests) |
| OK-01 | Implementing | ❌ Needs Fix (tests) |
| OK-03 | Implementing | ⚠️ Verified, spec wording to tighten |

(spec.md is not edited by the Verifier.)

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 29/33 matched; 3 gaps (RES-01 weak data, PED-01, OK-01), 1 minor spec-precision gap (OK-03)
**Sensor**: 23/30 mutants killed, 7 survived (M11, M12, M14, M15, M18, M23, M24)
**Gate**: 302 passed + 1 out-of-scope load flake that passes in isolation (303 total)

**What works**: card rules and their boundaries, the 1500 ms decision, decline without requests, no card data in requests or storage, cart kept on decline and on order failure, single order on double click and on retry, session pop-up with "Voltar" to the cart, library pop-up unchanged.

**Issues found**: tests cannot tell the right order body/summary values from constants that happen to equal the fixtures; the confirmation's prices are unasserted. No production defect found.

**Next steps**: route Fix 1 and Fix 2 to an implementer (tests only), then re-verify (iteration 2 of 3).
