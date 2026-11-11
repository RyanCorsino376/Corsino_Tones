# Library and Downloads Validation

**Date**: 2026-11-11
**Spec**: `.specs/features/etapa05-biblioteca/spec.md`
**Diff range**: `0b54ade..95c72e7` (T1..T4)
**Verifier**: independent sub-agent (author != verifier)
**Verdict**: PASS

Notes: the uncommitted formatting change in `frontend/servicos/carrinho.js` is outside the diff range and was ignored. Nothing was committed or edited besides this file.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | Done | `frontend/servicos/biblioteca.js`, `frontend/api/pedidos.js` |
| T2 | Done | `frontend/paginas/biblioteca.js`, `frontend/biblioteca.html` |
| T3 | Done | `frontend/ui/download.js` |
| T4 | Done | `frontend/paginas/pack.js` |

---

## Spec-Anchored Acceptance Criteria

Test files: S = `tests/biblioteca-servico.spec.js`, B = `tests/biblioteca.spec.js`, P = `tests/pack-pagina.spec.js`.

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| LIB-01 | Request `GET /pedidos?usuarioId={id}&status=pago`, then the catalogue | `S:49` `expect((await pedido).url()).toBe(\`${API}/pedidos?usuarioId=${id}&status=pago\`)`; `B:70` `waitForRequest(... === \`${API}/pedidos?usuarioId=${eu}&status=pago\`)`; impl `frontend/api/pedidos.js:18` | PASS (the "then the catalogue" order is not asserted; see gap 3) |
| LIB-02 | Only the user's own paid orders | `B:75` `toHaveCount(2)` with another user's and a `pendente` order seeded (B:67-68); `B:91-92` `not.toContainText(...)`; `S:60` `expect(packs.map(p => p.id)).toEqual(['metal-nux-mg-30','rock-boss-gt-1000'])` | PASS |
| LIB-03 | Block per pack: name, count, rows (name, "{marca} · {equipamento}", description) | `B:80` `h2 toHaveText(nome)`; `B:81` `.pack-quantidade toHaveText`; `B:85-87` `h3`, equipment `toHaveText(/· equipamento$/)`, `toContainText(descricao)`; singular `B:110` `toHaveText('1 preset')` | PASS (the "{marca}" label before the dot is not asserted; see gap 4) |
| LIB-04 | A pack in two paid orders shows once | `B:123-125` `toHaveCount(2)` plus order ROCK, BLUES; `S:55` `toEqual(['c','a','b'])` | PASS |
| LIB-05 | Newest order first, then `packIds` order | `B:77-78` (BLUES before ROCK, `.nth(i)`); `S:55` `toEqual(['c','a','b'])`; tie-break `S:70` `toEqual(['b','a'])` (impl `frontend/servicos/biblioteca.js:33-36`) | PASS |
| LIB-06 | "Sua biblioteca ainda está vazia." and "Explorar packs" -> `packs.html` | `B:145-147` `toBeVisible()`, `toHaveAttribute('href','packs.html')`, `blocos toHaveCount(0)`; absent when there are orders `B:93-94` | PASS |
| LIB-07 | Unknown `packId` is dropped, no notice | `B:134-136` `toHaveCount(1)`, `not.toContainText('fantasma')`, no `[role=alert/status]`; `S:84` `toEqual(['a'])` | PASS |
| LIB-08 | "Carregando biblioteca..." and no block while pending | `B:159-161` `toBeVisible()`, `blocos toHaveCount(0)`, empty text hidden; `B:164` loading gone after release | PASS |
| LIB-09 | Error text, "Tentar novamente", no block | `B:174-175` `getByText(msg).toBeVisible()`, `blocos toHaveCount(0)`; retry `B:177-180` | PASS |
| DL-01 | "Download" on every preset row | `B:193-196` `toHaveCount(total)` for the rows, buttons, and 1 button per row | PASS |
| DL-02 | File `preset-{id}.json` | `B:212` `expect(download.suggestedFilename()).toBe(\`preset-${alvo.id}.json\`)` (second preset) | PASS |
| DL-03 | JSON with 7 fields equal to the preset | `B:214-222` `expect(conteudo).toEqual({id, nome, estilo, marca, equipamento, descricao, packId})`; `B:223` the id differs from the first preset | PASS |
| DL-04 | No "Download" on `pack`, `packs`, `index` | `B:240-242` `getByText(/download/i)`, button, link `toHaveCount(0)` for the 3 pages | PASS |
| OWN-01 | Bought: "Na biblioteca" -> `biblioteca.html`, no add button | `P:175` `toHaveAttribute('href','biblioteca.html')`; `P:176` `adicionar toHaveCount(0)`; other pack `P:179-180`; impl `frontend/paginas/pack.js:61-67` | PASS |
| OWN-02 | Not bought (also bought by another / `pendente`): add button | `P:191` `adicionar toBeVisible()`; `P:192` `naBiblioteca toHaveCount(0)` | PASS |
| OWN-03 | Signed out: add button, no `/pedidos` request | `P:203` `toBeVisible()`; `P:204` `expect(pedidos).toEqual([])` | PASS |
| OWN-04 | Orders failure: pack and add button still show | `P:215-217` `h1 not.toHaveText('')`, `adicionar toBeVisible()`, error text count 0 | PASS |
| REG-01 | Signed out: pop-up, no library request, no navigation | `B:49` `toContainText('Faça login para acessar sua biblioteca')`; `B:54` `url unchanged after 60 s`; `B:55` no `meta refresh`; `B:56` `expect(pedidos).toEqual([])` | PASS |
| REG-02 | "No carrinho" kept for a non-bought pack in the cart | `P:226` `getByRole('link',{name:'No carrinho'}) toHaveAttribute('href','carrinho.html')`; `P:227-228` | PASS |

**Status**: 19/19 criteria covered with asserted values equal to the spec outcomes. Spec-precision gaps: none that block (see minor gaps).

---

## Discrimination Sensor

Scratch: temporary git worktree at HEAD (`git worktree add --detach`), `git worktree remove --force` afterwards, no `git stash`. Real-tree `git status --porcelain` before and after: identical (` M frontend/servicos/carrinho.js` only). Each mutant ran only the spec files covering the mutated module.

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| 1 | `frontend/servicos/biblioteca.js:35` | sort direction flipped | Killed (`S:46`) |
| 2 | `frontend/servicos/biblioteca.js:49` | de-duplication removed | Killed (`S:46`) |
| 3 | `frontend/api/pedidos.js:18` | `&status=pago` dropped from URL | Killed (`S:30`) |
| 4 | `frontend/servicos/biblioteca.js:52` | missing pack kept as a placeholder | Killed (`S:74`) |
| 5 | `frontend/ui/download.js:149` | file name uses `packId` | Killed (`B:201`) |
| 6 | `frontend/ui/download.js:145` | `descricao` dropped from the JSON | Killed (`B:201`) |
| 7 | `frontend/paginas/pack.js:54` | ownership inverted | Killed (`P:169`) |
| 8 | `frontend/paginas/pack.js:55-56` | orders failure rethrown | Killed (`P:208`) |
| 9 | `frontend/paginas/biblioteca.js:118` | empty block always hidden | Killed (`B:140`) |
| 10 | `frontend/paginas/biblioteca.js:109` | preset count off by one | Killed (`B:62`) |
| 11 | `frontend/paginas/biblioteca.js:126` | session guard disabled | Killed (`B:41`) |
| 12 | `frontend/paginas/biblioteca.js:131` | library requested for user id 1 | Killed (`B:98`) |
| 13 | `frontend/paginas/pack.js:64` | "Na biblioteca" href points to `carrinho.html` | Killed (`P:169`) |

**Sensor depth**: lightweight, extended (13 mutations; the payment-like integrity path is ownership/ordering)
**Result**: 13/13 killed, PASS

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | OK |
| Surgical changes | OK (12 files, all in scope; `ui/` does not import `api/`) |
| No scope creep ("Download" only in the library) | OK |
| Matches patterns (`carregarComEstado`, `pedirLogin`, `ROTULOS`) | OK |
| Spec-anchored outcome check | OK |
| Every test maps to an AC or edge case | OK |
| Documented guidelines | none - strong defaults applied |

## Edge Cases

- [x] Same pack in two paid orders shows once (`B:123-125`)
- [x] Non-`pago` order does not list its packs (`B:67`, `B:142`, `S:61`)
- [x] Another user's library is not shown (`B:68`, `B:91-92`, `S:60`)

---

## Gate Check

- **Gate command**: `node mock/preparar.js --reset` then `npx playwright test`
- **Result**: 327 passed, 0 failed, 0 skipped
- **Test count before feature**: 305 (the T1 note says 305 + 6; the 303 in the header is stale)
- **Test count after feature**: 327
- **Delta**: +22 tests (6 + 8 + 3 + 5, matches the task notes)
- **Failures**: none

---

## Requirement Traceability Update

LIB-01..09, DL-01..04, OWN-01..04, REG-01..02: Implementing -> Verified.

## Summary

**Overall**: Ready
**Spec-anchored check**: 19/19 criteria matched
**Sensor**: 13/13 mutations killed
**Gate**: 327 passed

**Minor gaps (non-blocking), ranked**:
1. OWN-01 vs REG-02 precedence: a pack both bought and in the cart is not tested; the code shows "Na biblioteca" first (`frontend/paginas/pack.js:61`). The spec is silent: spec-precision gap.
2. LIB-09 and OWN-04 only simulate `route.abort()` on `/pedidos`; a failing `/packs` or `/presets` call is not exercised on the library page.
3. LIB-01 "then the catalogue": only the orders request URL is asserted, not the catalogue read.
4. LIB-03: the brand label before "·" is not asserted (`B:86` checks only the equipment suffix).
5. `tests/biblioteca.spec.js` DL-04 loop does not cover the cart or checkout pages (outside the spec, which names three pages).
