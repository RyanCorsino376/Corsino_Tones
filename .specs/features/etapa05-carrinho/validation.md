# Shopping Cart (etapa05-carrinho) Validation

**Date**: 2026-11-09
**Spec**: `.specs/features/etapa05-carrinho/spec.md`
**Diff range**: `fe55b67..2136bfb` (4 implementation commits + 1 test-fix commit on `feat/etapa05-loja`)
**Verifier**: independent sub-agent (author ≠ verifier), iteration 2 of 3

**Verdict**: PASS

---

## Iteration history

| Iteration | HEAD | Verdict | Summary |
| --------- | ---- | ------- | ------- |
| 1 | `88c842b` | FAIL | 31 mutants: 23 killed, 2 equivalent (M15, M23), 6 survived (M01, M05, M23b, M24, M29, M30). No production defect; all six were test-strength gaps (HDR-01 visibility/href, CAR-02, CAR-03, PAGC-01, EDGE-03). Spec note: PAGC-02 "integer cents" not observable. Gate 268 passed. |
| 2 | `2136bfb` | PASS | `2136bfb` strengthens the tests for all six survivors (+4 tests) and corrects a comment in `frontend/paginas/pack.js:59-60`. All six survivors now killed, 7 regression mutants and 4 new mutants killed. Gate 272 passed. |

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `ff24db2` |
| T2 | ✅ Done | `6819ad2` |
| T3 | ✅ Done | `8e4bd6f`; comment corrected in `2136bfb` (now accurate: the second click of a double click follows the "No carrinho" link) |
| T4 | ✅ Done | `88c842b` |
| Verifier fixes (iteration 1) | ✅ Done | `2136bfb`; tests only, plus the comment. No production code changed (diff of `frontend/` is the comment only) |

---

## Spec-Anchored Acceptance Criteria

Line numbers refer to the files at `2136bfb`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| CAR-01 | key `corsino:carrinho`, JSON array, add order | `tests/carrinho-servico.spec.js:33` - `expect(await lerChave(page)).toBe('["rock-boss-gt-1000","clean-zoom-g6"]')` | ✅ PASS |
| CAR-02 | re-adding leaves cart unchanged | `tests/carrinho-servico.spec.js:31` - `expect(await lerChave(page)).toBe('["rock-boss-gt-1000"]')` right after the second add | ✅ PASS (iteration 1 gap closed; M01 killed) |
| CAR-03 | not array / bad item → `[]` and key removed | `tests/carrinho-servico.spec.js:67-68` - `toEqual([])`, `lerChave(page)).toBeNull()` over 6 samples incl. `["rock-"]`, `["rock-boss-GT"]` (`:62-63`) | ✅ PASS (gap closed; M05, N03, N04 killed) |
| CAR-04 | others keep order | `tests/carrinho-servico.spec.js:52` - `toBe('["b-2","c-3"]')` | ✅ PASS |
| ADD-01 | button "Adicionar ao carrinho" in info block | `tests/carrinho-pagina.spec.js:27` - `.preset-info` … `getByRole('button', { name: 'Adicionar ao carrinho' })).toBeVisible()` | ✅ PASS |
| ADD-02 | id stored; link "No carrinho" → `carrinho.html`; status text; no reload/leave | `tests/carrinho-pagina.spec.js:39-45` - `toBe('["rock-zoom-g6"]')`, `toHaveAttribute('href','carrinho.html')`, `getByRole('status')…toHaveText('Pack adicionado ao carrinho.')`, `semRecarregar toBe(true)`, `toHaveURL(...)` | ✅ PASS |
| ADD-03 | "No carrinho" when in cart, also after reload | `tests/carrinho-pagina.spec.js:54-55` - `linkNoCarrinho toBeVisible()`, `botaoAdicionar toHaveCount(0)` | ✅ PASS |
| ADD-04 | never stored twice | `tests/carrinho-pagina.spec.js:73` - `toBe('["clean-nux-mg-30"]')` after `dblclick`; `:82` two packs | ✅ PASS |
| ADD-05 | no button/link in not-found, loading, error | `tests/carrinho-pagina.spec.js:90-91` - `toHaveCount(0)`; `:100-101,105-106` - `toBeHidden()` | ✅ PASS |
| HDR-01 | visible link to `carrinho.html` "Carrinho (N)" on 6 pages | `tests/cabecalho.spec.js:158-169` loop over all 6 pages incl. `carrinho.html` - locator `a.carrinho[href="carrinho.html"]` (`:149`) `toBeVisible()` (`:162,168`), `toHaveText('Carrinho (0)')` / `('Carrinho (2)')` | ✅ PASS (gap closed; M23b, M24, N01 killed) |
| HDR-02 | N updates on add/remove without reload | `tests/carrinho-pagina.spec.js:43` (add) - `toHaveText('Carrinho (1)')`; `:180` (remove) - `toHaveText('Carrinho (2)')` | ✅ PASS |
| HDR-03 | shown signed in and out, next to Entrar/Olá | `tests/cabecalho.spec.js:184-191` - `toBeVisible()`; `tests/carrinho-pagina.spec.js:273,277` | ✅ PASS |
| HDR-04 | "Sair" empties cart; index shows "Carrinho (0)" | `tests/cabecalho.spec.js:204-205` - `toBeNull()`, `toHaveText('Carrinho (0)')` | ✅ PASS |
| HDR-05 | login keeps the cart | `tests/cabecalho.spec.js:217-218` - `toHaveText('Carrinho (1)')`, `toBe('["metal-nux-mg-30"]')` | ✅ PASS |
| PAGC-01 | `GET /packs`; cart order; `nome` → `pack.html?id={id}`; its price; "Remover" | `tests/carrinho-pagina.spec.js:137-139` - `toHaveAttribute('href', \`pack.html?id=${id}\`)`, `.item-preco toHaveText(...)`, `Remover toBeVisible()`; `:158` - `.item-preco toHaveText([formatoBRL(1010), formatoBRL(2020), formatoBRL(70)])` with distinct prices | ✅ PASS (gap closed; M29, N02 killed) |
| PAGC-02 | "{N} packs"/"1 pack"; "Total: {sum}" in integer cents | `tests/carrinho-pagina.spec.js:156-157` - `toHaveText(\`Total: ${formatoBRL(3100)}\`)`, `'3 packs no carrinho'`; `:187` - `'1 pack no carrinho'` | ✅ PASS / ⚠️ Spec-precision note (carried from iteration 1, non-blocking): "computed in integer cents" is not observable in the UI (M15 equivalent); code-review evidence `frontend/paginas/carrinho.js:63` (`reduce` over `precoCentavos`) |
| PAGC-03 | removed from cart, list, total; count + header updated; no reload | `tests/carrinho-pagina.spec.js:174-183` - names `toEqual([...])`, count, total, `Carrinho (2)`, storage `toBe('["rock-boss-gt-1000","metal-nux-mg-30"]')`, `semRecarregar`, `pedidos toBe(1)` | ✅ PASS |
| PAGC-04 | empty text, "Ver os packs" → `packs.html`, no request, no total | `tests/carrinho-pagina.spec.js:209-214` - `toBeVisible()`, `toHaveAttribute('href','packs.html')`, `toBeHidden()`, `pedidos toEqual([])` | ✅ PASS |
| PAGC-05 | last removed → empty state | `tests/carrinho-pagina.spec.js:197-201` | ✅ PASS |
| PAGC-06 | "Carregando carrinho..." in `role=status`, no items | `tests/carrinho-pagina.spec.js:238-239` - `getByRole('status')…toHaveText(CARREGANDO)`, `itens toHaveCount(0)` | ✅ PASS |
| PAGC-07 | unknown id removed, not listed/summed, notice | `tests/carrinho-pagina.spec.js:223-226` - notice `toBeVisible()`, `toHaveCount(1)`, total, storage `toBe('["clean-zoom-g6"]')` | ✅ PASS |
| PAGC-08 | error text + "Tentar novamente" repeats; cart unchanged | `tests/carrinho-pagina.spec.js:259-265` - `toHaveText(ERRO)`, storage unchanged, retry → 2 items, `tentativas toBe(2)` | ✅ PASS |
| REG-01 | earlier features still pass | full suite: 272 passed | ✅ PASS |
| REG-02 | responsive criteria on the group | `tests/responsive.spec.js:37,46,59,81` - `.acoes-cabecalho` position; `:159` overflow list incl. `carrinho.html` | ✅ PASS |
| EDGE-01 | stored elsewhere → "No carrinho" | `tests/carrinho-pagina.spec.js:63` - `linkNoCarrinho toBeVisible()` | ✅ PASS |
| EDGE-02 | remaining keep order | `tests/carrinho-pagina.spec.js:176,181`; `tests/carrinho-servico.spec.js:52` | ✅ PASS |
| EDGE-03 | hand-edited duplicate = one item | `tests/carrinho-servico.spec.js:75` - `toEqual(['a-b','c'])`; `tests/cabecalho.spec.js:178` - header `toHaveText('Carrinho (1)')` with `["clean-zoom-g6","clean-zoom-g6"]` stored | ✅ PASS (gap closed; M30, M02 killed) |

**Status**: ✅ 27/27 covered and matching the spec outcome; 1 non-blocking spec-precision note (PAGC-02 "integer cents", not observable).

---

## Discrimination Sensor

Scratch worktree at `2136bfb` under the session scratchpad, `node_modules` symlinked, `node mock/preparar.js --reset` before each mutant, `CI=1`. Each mutant ran only the spec files covering the mutated module. Mutant IDs reuse iteration 1 numbering; N* are new.

| # | File | Mutation | Specs run | Result (failing test) |
| - | ---- | -------- | --------- | --------------------- |
| M01 | `frontend/servicos/carrinho.js:38` | append to raw stored list even if present | servico, pagina, cabecalho | ✅ Killed (1 failed: `carrinho-servico.spec.js:27`) |
| M05 | `frontend/servicos/carrinho.js:8` | regex `$` dropped | same | ✅ Killed (2 failed: the two new CAR-03 samples) |
| M23b | `frontend/login.html:23` | `style="display:none"` on cart link | cabecalho, responsive | ✅ Killed (1 failed: `cabecalho.spec.js:160` login.html) |
| M24 | `frontend/carrinho.html:23` | cart link `href="index.html"` | pagina, cabecalho, responsive | ✅ Killed (1 failed: `cabecalho.spec.js:160` carrinho.html) |
| M29 | `frontend/paginas/carrinho.js:36` | every line shows the first item's price | pagina | ✅ Killed (1 failed: `carrinho-pagina.spec.js:147`) |
| M30 | `frontend/ui/cabecalho.js:9` | counter counts raw stored ids | cabecalho, pagina | ✅ Killed (1 failed: `cabecalho.spec.js:174`) |
| M02 | `frontend/servicos/carrinho.js:18` | no dedup on read | servico, pagina, cabecalho | ✅ Killed (`cabecalho.spec.js:174`, `carrinho-servico.spec.js:73`) |
| M03 | `frontend/servicos/carrinho.js:23` | corrupt value not removed | same | ✅ Killed (6 failed: every CAR-03 sample) |
| M07 | `frontend/servicos/carrinho.js:43` | remove reverses order | same | ✅ Killed (`carrinho-pagina.spec.js:162`, `carrinho-servico.spec.js:49`) |
| M08 | `frontend/servicos/carrinho.js:28` | `sessionStorage` instead of `localStorage` | same | ✅ Killed (11 failed) |
| M11 | `frontend/ui/cabecalho.js:36` | "Sair" does not empty the cart | cabecalho, pagina | ✅ Killed (`cabecalho.spec.js:195`) |
| M17 | `frontend/paginas/carrinho.js:83` | empty cart still requests `/packs` | pagina | ✅ Killed (`carrinho-pagina.spec.js:205`) |
| M21 | `frontend/paginas/carrinho.js:45-46` | "Remover" reloads the page | pagina | ✅ Killed (`carrinho-pagina.spec.js:162`) |
| N01 | `frontend/carrinho.html:23` | `style="display:none"` on cart link of `carrinho.html` (new loop entry) | cabecalho, pagina, responsive | ✅ Killed (`cabecalho.spec.js:160` carrinho.html) |
| N02 | `frontend/paginas/carrinho.js:36` | each line shows the price of the mirrored item (prices reversed) | pagina | ✅ Killed (`carrinho-pagina.spec.js:147`) |
| N03 | `frontend/servicos/carrinho.js:8` | regex `(-[a-z0-9]*)*` accepts trailing hyphen | servico, pagina, cabecalho | ✅ Killed (`carrinho-servico.spec.js:65` "id terminado em hífen") |
| N04 | `frontend/servicos/carrinho.js:8` | regex accepts uppercase after a dash | same | ✅ Killed (`carrinho-servico.spec.js:65` "id com maiúsculas no fim") |

**Sensor depth**: expanded (17 mutants this iteration; 31 in iteration 1)
**Result**: 17 injected, 17 killed, 0 survived - ✅ PASS

Note: during N03 and N04 the machine was under load (load average ~6, runs of 3-4 min instead of ~30 s) and 2 unrelated tests each also failed by timeout (`cabecalho.spec.js:195,209` in N03; `cabecalho.spec.js:123,134` in N04). Both mutants were killed by their intended test regardless; the unrelated failures are environment noise (the same tests pass in the clean gate run).

Isolation: real-tree `git status --porcelain` identical before and after the sensor (`.specs/LESSONS.md`, `.specs/lessons.json`, `tasks.md` modified, `validation.md` untracked); worktree removed (`git worktree list` shows only the main tree); ports 8080/3000 free afterwards.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`2136bfb`: test additions + one comment) |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met | ✅ (EDGE-03 now at service and header) |
| Every test maps to a spec requirement | ✅ (each new test is commented with its ID and the gap it closes) |
| Documented guidelines followed: none - strong defaults applied | ✅ |

---

## Edge Cases

- [x] EDGE-01: stored before opening → "No carrinho"
- [x] EDGE-02: order kept after removal
- [x] EDGE-03: duplicate counts once at service and header

---

## Gate Check

- **Gate command**: `npx playwright test` (real tree, `CI=1`, ports 8080/3000 free beforehand)
- **Result**: 272 passed, 0 failed, 0 skipped (2.2 min)
- **Test count before feature**: 233
- **Test count after iteration 1**: 268
- **Test count now**: 272
- **Delta**: +39 over the baseline (+4 in `2136bfb`: `carrinho.html` in the HDR-01 loop, header duplicate test, two CAR-03 samples)
- **Skipped tests**: none
- **Failures**: none
- **Existing tests changed in `2136bfb`**: only additions (two `toBeVisible()` lines, one extra loop entry, one `toHaveText` array, one storage assertion). No assertion removed or weakened.

---

## Fix Plans

None. Spec note carried over (no fix task): PAGC-02 "computed in integer cents" is not observable; keep it as a design rule or accept the code-review evidence at `frontend/paginas/carrinho.js:63`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| All 27 (CAR-01..04, ADD-01..05, HDR-01..05, PAGC-01..08, REG-01..02, EDGE-01..03) | Implementing | ✅ Verified |

(spec.md not edited by the Verifier.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 27/27 matched spec outcome; 1 non-blocking spec-precision note (PAGC-02 integer cents)
**Sensor**: 17/17 mutations killed (6 former survivors, 7 regression, 4 new)
**Gate**: 272 passed

**What works**: all cart behaviour, now with discriminating tests for header visibility/href on all 6 pages, per-line prices, the regex end anchor, re-add storage, and duplicates in the header.

**Issues found**: none.

**Next steps**: interactive UAT if desired; update spec.md traceability to Verified.
