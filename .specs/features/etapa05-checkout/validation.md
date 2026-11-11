# Checkout and Order (etapa05-checkout) Validation

**Date**: 2026-11-11
**Spec**: `.specs/features/etapa05-checkout/spec.md`
**Diff range**: `147a26d..95c72e7` for the checkout files (implementation `99b3c60`, test fixes `c37dc67`, `c392065`, `b76dff1`); sensor ran on a scratch worktree of `HEAD` = `95c72e7`
**Verifier**: independent sub-agent (author ≠ verifier), iteration 3 of 3

**Verdict**: PASS

> **Iteration 3 result (2026-11-11):** the iteration-2 survivors are closed. N15 (strip every non-digit) is killed (1 failed, 32 passed) and N01 (`includes('0000')`) is killed (2 failed, 31 passed). Full gate: 327 passed, 0 failed. REG-01 is unblocked (`ajustes.spec.js:12` fixed in `b76dff1`). Re-applied sample M11, M12, M14, M18, M23, M24, N06, N13: all killed.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `cefde13` |
| T2 | ✅ Done | `83b7d83` |
| T3 | ✅ Done | `b7d0caa` |
| T4 | ✅ Done | `ca83924` |
| T5 | ✅ Done | `99b3c60`, tests strengthened in `c37dc67`: all 7 iteration-1 survivors are now killed |

---

## Spec-Anchored Acceptance Criteria

Line numbers are those of the files at `HEAD`.

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| CK-01 | Link "Finalizar compra" → `checkout.html` while the list shows | `tests/checkout.spec.js:30-31` - `toBeVisible()`, `toHaveAttribute('href','checkout.html')` | ✅ PASS |
| CK-02 | No link in empty, loading, error states | `tests/checkout.spec.js:35` (empty), `:47-48` (`toHaveCount(1)` then `toBeHidden()` while loading), `:51` (error) | ✅ PASS |
| ACC-01 | Modal dialog with the text, no form, no request, no self-navigation | `tests/checkout.spec.js:91-99` - `toContainText('Faça login para finalizar a compra')`, `:modal` true, form `toHaveCount(1)`+`toBeHidden()`, URL after 60 s fake clock, no meta refresh, `pedidos` `toEqual([])` | ✅ PASS |
| ACC-02 | `login.html?voltar=checkout.html` | `tests/checkout.spec.js:107` - `toHaveURL(/login\.html\?voltar=checkout\.html$/)` | ✅ PASS |
| ACC-03 | "Voltar" and Esc → `carrinho.html` | `tests/checkout.spec.js:111-121` - `toHaveURL(/carrinho\.html$/)` for both | ✅ PASS |
| ACC-04 | Lands on `checkout.html`, cart unchanged | `tests/checkout.spec.js:133-135` - URL, 2 items, storage `'["rock-zoom-g6","clean-nux-mg-30"]'` | ✅ PASS |
| RES-01 | `GET /packs`; packs in cart order with name and formatted price; "Total: {sum}" | `tests/checkout.spec.js:141-160` - distinct prices 4990/2590 via `page.route`, non-alphabetical cart, per-index name and `.item-preco` `toHaveText(formatoBRL(PRECOS[id]))`, total and "Pagar {total}" | ✅ PASS (M15, M23, N14, N18 killed). Iteration-1 gap closed |
| RES-02 | Empty text, "Ver os packs" → `packs.html`, no form, no request | `tests/checkout.spec.js:169-174` | ✅ PASS |
| RES-03 | Unknown pack removed + exact notice | `tests/checkout.spec.js:181-183` - exact text, 1 item, storage `'["rock-zoom-g6"]'` | ✅ PASS (N07 killed) |
| RES-04 | Exact error text, "Tentar novamente", no form | `tests/checkout.spec.js:210-213` | ✅ PASS |
| RES-05 | "Carregando carrinho..." and no form while pending | `tests/checkout.spec.js:193-197` | ✅ PASS |
| FORM-01 | Four labelled fields + "Pagar {total}" | `tests/checkout.spec.js:249-250` - `getByLabel(rotulo,{exact:true}).toBeVisible()`, button text | ✅ PASS |
| FORM-02 | 16 digits once spaces removed; exact message | `tests/pagamento.spec.js:31-34`, `tests/checkout.spec.js:258-263` | ✅ PASS (N03, N15 killed). `tests/pagamento.spec.js:35` now rejects `4111-1111-1111-1111` and `4111111111111111a`; hole closed |
| FORM-03 | ≥ 2 chars after trim; exact message | `tests/pagamento.spec.js:40-42` (incl. `' R '`) | ✅ PASS (N02, N16 killed) |
| FORM-04 | `MM/AA`, month 01-12, not before current month | `tests/pagamento.spec.js:48-50` - accepts `11/26` (current), rejects `10/26`, `13/27`, `00/27` ... with fixed `hoje` | ✅ PASS (N11, N17 killed) |
| FORM-05 | Exactly 3 digits | `tests/pagamento.spec.js:56-57` - rejects `12`, `1234`, `12a` | ✅ PASS |
| FORM-06 | `aria-invalid`, `aria-describedby` → message, focus first rejected, no payment | `tests/checkout.spec.js:262-267`, `:275-277` (focus on validade, not numero), `:299` (no duplicates) | ✅ PASS |
| FORM-07 | Editing to valid removes message and `aria-invalid` without submit | `tests/checkout.spec.js:288-290` | ✅ PASS |
| PAY-01 | Decision at 1500 ms, not before | `tests/pagamento.spec.js:77-80` - `'pendente'` at 1499 ms, decided at 1501 ms | ✅ PASS (N10 killed) |
| PAY-02 | Disabled + "Processando pagamento..." while pending | `tests/checkout.spec.js:340-341` | ✅ PASS |
| PAY-03 | Card **ending** in `0000` is declined; exact text in `role="alert"`, cart/values kept, button back, no request | `tests/checkout.spec.js:391-397`; rule at `tests/pagamento.spec.js:63` (only `…1111` and `…0000`) | ✅ PASS (N01 killed). `tests/pagamento.spec.js:67-70` adds `4111 0000 1111 1111` and `0000 1111 1111 1111` expecting `'aprovado'`; hole closed |
| PAY-04 | No card field in any request, nothing stored | `tests/checkout.spec.js:371-379` (digits, formatted number, name, expiry, `cvv\|cartao\|numero\|validade` in URL+body; storage), `tests/pagamento.spec.js:93` | ✅ PASS (N19 killed) |
| PED-01 | `POST /pedidos` with session `usuarioId`, `packIds` in cart order, `totalCentavos` = summary total, `status:"pago"`, ISO `criadoEm`, no other field | `tests/checkout.spec.js:347-349` - exact key set; `toMatchObject({ usuarioId: 7, packIds: ['rock-zoom-g6','clean-nux-mg-30'], totalCentavos: 7580, status: 'pago' })`; ISO round-trip | ✅ PASS (M11, M12, M14, N04, N05 killed). Iteration-1 gap closed |
| PED-02 | Cart emptied only after `POST` succeeds | `tests/checkout.spec.js:414` - storage kept after aborted POST; `:368` emptied after success | ✅ PASS (N06, N13 killed) |
| PED-03 | Exact failure text in `role="alert"`, cart/values kept, button back | `tests/checkout.spec.js:413-417`, retry creates one order `:421` | ✅ PASS (N09 killed) |
| OK-01 | "Compra aprovada!", "Pedido nº {id}", packs with their prices, total, "Ir para a biblioteca" → `biblioteca.html`; form + summary replaced | `tests/checkout.spec.js:353-365` - heading, `expect(pedidoCriado.id).not.toBe(1)` then `toHaveText('Pedido nº ${pedidoCriado.id}')`, per-item name + `.item-preco`, total, link `href`, form and summary hidden | ✅ PASS (M18, M24 killed). Iteration-1 gap closed |
| OK-02 | Header "Carrinho (0)" | `tests/checkout.spec.js:367` | ✅ PASS |
| OK-03 | `corsino:carrinho` key removed | `tests/checkout.spec.js:368` - `toBeNull()` | ✅ PASS (spec reworded; precision gap closed; N13 killed) |
| OK-04 | Reload → empty state, no new order | `tests/checkout.spec.js:443-445` | ✅ PASS |
| REG-01 | Slices 1-4 kept; library "Voltar" → `index.html` | `tests/cabecalho.spec.js:108-115` + full gate | ✅ PASS. `tests/cabecalho.spec.js:108-115` + full gate 327/327; `tests/ajustes.spec.js:12` repaired in `b76dff1` |
| EDGE-01 | Double click → one payment, ≤ 1 POST | `tests/checkout.spec.js:429-431` | ✅ PASS |
| EDGE-02 | Current-month expiry accepted | `tests/pagamento.spec.js:48` (`11/26` with `hoje` 2026-11-15) | ✅ PASS |
| EDGE-03 | Number with spaces accepted | `tests/pagamento.spec.js:32`, used end-to-end by `CARTAO_OK` | ✅ PASS |

**Status**: ✅ 33/33 matched with evidence.

---

## Discrimination Sensor

Scratch: `git worktree add --detach` under the session scratchpad, `node_modules` symlinked, `node mock/preparar.js --reset` before each mutant, `CI=1`. Each mutant ran only the spec files covering the mutated module (`pagamento.js` and `pedidos.js`: pagamento + checkout, 31 tests; `checkout.js`: checkout, 22 tests). Baseline in the worktree: 31/31 passed.

| # | File:line | Description | Specs run | Killed? |
| - | --------- | ----------- | --------- | ------- |
| M11 | `frontend/paginas/checkout.js:172` | `usuarioId: usuarioAtual().id` → `1` | checkout | ✅ Killed (1 failed) |
| M12 | `frontend/paginas/checkout.js:173` | `packIds` sorted | checkout | ✅ Killed |
| M14 | `frontend/paginas/checkout.js:174` | `totalCentavos` = first price × count | checkout | ✅ Killed |
| M15 | `frontend/paginas/checkout.js:48` | Summary total = count × 4990 | checkout | ✅ Killed (2 failed) |
| M18 | `frontend/paginas/checkout.js:139` | Fixed "Pedido nº 1" | checkout | ✅ Killed |
| M23 | `frontend/paginas/checkout.js:40` | Summary item prices all from the first item | checkout | ✅ Killed (2 failed) |
| M24 | `frontend/paginas/checkout.js:142` | Confirmation items without prices | checkout | ✅ Killed |
| N01 | `frontend/servicos/pagamento.js:49` | `endsWith('0000')` → `includes('0000')` (declines a card with 0000 in the middle) | pagamento, checkout | ✅ Killed (iteration 3: 2 failed, 31 passed) |
| N02 | `frontend/servicos/pagamento.js:28` | Name `>= 2` → `> 2` | pagamento, checkout | ✅ Killed |
| N03 | `frontend/servicos/pagamento.js:27` | Number `\d{16}` → `\d{16,17}` | pagamento, checkout | ✅ Killed |
| N04 | `frontend/paginas/checkout.js:175` | Order `status` `'pago'` → `'pendente'` | checkout | ✅ Killed |
| N05 | `frontend/paginas/checkout.js:176` | `criadoEm` as `toString()` instead of ISO | checkout | ✅ Killed |
| N06 | `frontend/paginas/checkout.js:183` | Cart emptied when the order request fails | checkout | ✅ Killed |
| N07 | `frontend/paginas/checkout.js:62` | Unknown packs no longer removed from the cart | checkout | ✅ Killed |
| N08 | `frontend/paginas/checkout.js:186` | Button text after a failure fixed to `Pagar` (no total) | checkout | ✅ Killed (2 failed) |
| N09 | `frontend/paginas/checkout.js:183` | Order failure shows the decline message | checkout | ✅ Killed |
| N10 | `frontend/servicos/pagamento.js:15` | Wait 1500 → 2500 ms | pagamento, checkout | ✅ Killed (2 failed) |
| N11 | `frontend/servicos/pagamento.js:32` | Expiry century `2000` → `2100` | pagamento, checkout | ✅ Killed (2 failed) |
| N12 | `frontend/api/pedidos.js:9` | `POST` → `PUT` | pagamento, checkout | ✅ Killed (5 failed) |
| N13 | `frontend/paginas/checkout.js:178` | Cart not emptied after a successful order | checkout | ✅ Killed (2 failed) |
| N14 | `frontend/paginas/checkout.js:48` | Total reduce seed `0` → `1` (off by one cent) | checkout | ✅ Killed (3 failed) |
| N15 | `frontend/servicos/pagamento.js:24` | Strip every non-digit instead of spaces only (accepts `4111-1111-1111-1111`) | pagamento, checkout | ✅ Killed (iteration 3: 1 failed, 32 passed) |
| N16 | `frontend/servicos/pagamento.js:28` | Name rule without `trim()` | pagamento, checkout | ✅ Killed |
| N17 | `frontend/servicos/pagamento.js:30` | Month regex `1[0-2]` → `1[0-3]` | pagamento, checkout | ✅ Killed |
| N18 | `frontend/paginas/checkout.js:51` | Summary total = count × first price | checkout | ✅ Killed |
| N19 | `frontend/paginas/checkout.js:171` | Last 4 digits of the card added to the order body | checkout | ✅ Killed |

**Sensor depth**: P0-full (payment / order / data integrity), manual fault injection, 26 mutants across iterations 1-2; iteration 3 re-applied 10 of them on a clean worktree of `HEAD` `95c72e7` (`git worktree add --detach`, no `git stash`, `node mock/preparar.js --reset` before each; baseline pagamento + checkout 33/33 passed)
**Result**: 26/26 killed - PASS ✅

Iteration 3 re-run: N15 1 failed, N01 2 failed, M11 1, M12 1, M14 1, M18 1, M23 2, M24 1, N06 2, N13 2 failed; all killed. The worktree was removed and `git status --porcelain` of the real tree equals the initial one (only `frontend/servicos/carrinho.js`, `.specs/` edits and the new library `validation.md`).

Note: a first M12 attempt (`.sort()` on pack objects) was a semantic no-op and was discarded; the valid form (`.map(id).sort()`) is killed.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ |
| Per-layer coverage (service boundaries 1:1; page happy + edge + error) | ✅ |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `.specs/LESSONS.md` (L-001, L-009, L-010, L-014 applied; L-002 now applied to FORM-02) | ✅ |

---

## Edge Cases

- [x] EDGE-01 double click: one POST (`checkout.spec.js:429-431`)
- [x] EDGE-02 current month accepted (`pagamento.spec.js:48`)
- [x] EDGE-03 number with spaces accepted (`pagamento.spec.js:32`)

---

## Gate Check

- **Gate command**: `npx playwright test` (Build, from tasks.md), run on the real tree with `CI=1` after `node mock/preparar.js --reset`
- **Result**: 327 passed, 0 failed, 0 skipped (59 s), run after `node mock/preparar.js --reset` with `CI=1` (Playwright started ports 3000/8080)
- **Real tree during the run**: `frontend/servicos/carrinho.js` modified plus `.specs/` edits (belongs to the library slice); the Verifier did not touch it
- **Test count before this feature**: 272; **after (iteration 1)**: 303; **iteration 2**: 316; **now**: 327 (includes library tests)
- **Skipped tests**: none

---

## Fix Plans

None. Fixes 1 and 2 of iteration 2 (PAY-03, FORM-02) and the `ajustes.spec.js:12` note are closed by `c392065` and `b76dff1`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CK-01..02, ACC-01..04, RES-01..05, FORM-01, FORM-03..07, PAY-01, PAY-02, PAY-04, PED-01..03, OK-01..04, EDGE-01..03 | Implementing / Needs Fix | ✅ Verified |
| FORM-02, PAY-03, REG-01 | Needs Fix / Blocked | ✅ Verified |

(spec.md is not edited by the Verifier.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 33/33 matched with `file:line` evidence
**Sensor**: 26/26 mutants killed (iteration 3 re-ran N15, N01, M11, M12, M14, M18, M23, M24, N06, N13)
**Gate**: 327 passed, 0 failed

**What works**: every iteration-2 gap is closed, no production defect found, the gate is green.

**Residual risk (low)**: the sensor is manual fault injection over a sample in this iteration, not an exhaustive run; `tests/pagamento.spec.js:67-70` pins the "ends in 0000" rule with two examples.

**Next steps**: none for this feature.
