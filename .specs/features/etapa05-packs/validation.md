# Style Packs Replace Preset Cards (etapa05-packs) Validation

**Date**: 2026-11-06
**Spec**: `.specs/features/etapa05-packs/spec.md` (revision 2, 40 IDs)
**Diff range**: `13b8425..cd37f20` (branch `feat/etapa05-loja`)
**Verifier**: independent sub-agent (author ≠ verifier), iteration 2 of 3

**Verdict**: PASS

All four gaps from iteration 1 are closed: M22, M24 and the old README are now killed, and so is M03 (the `equipamento` branch). The LIST-01 menu is asserted on `pack.html`. The gate passes 233/233, and 16/16 mutants are killed.

---

## Iteration 1 summary (HEAD `ba7afee`)

FAIL. 33 mutants, 29 killed. Equivalent survivors: M01 (brand filter on preset brands) and M03 (search without `pack.equipamento`, unobservable because `nome` always contains the model). Real survivors: M22 (disabled style limited to `#form-login button:disabled`) and M24 (name sort by code point instead of `pt-BR`). Other gaps: the README still described revision 1 packs ("para qualquer equipamento", `pack.html?id=rock`); the LIST-01 menu was not asserted on `pack.html`; the noscript copy said "presets".

Fix commit `cd37f20`: README rewrite plus two README tests (`tests/ajustes.spec.js:73`, `:87`); disabled style asserted on the registration button and on a created button on `packs.html` (`:36`, `:52`); a `pt-BR` order test with fulfilled names (`tests/packs-lista.spec.js:323`); a model-only search test (`:251`); `pack.html` added to the menu loop (`:70`); noscript copy fixed (`frontend/packs.html:114`).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T7 | ✅ Done | `13a8891`..`3ff399c` |
| T8-T10 | ✅ Done | `ba7afee` (combined commit, deviation documented in T8) |
| Verifier Fixes (iteration 1) | ✅ Done | `cd37f20`; checked here against the code, not taken from tasks.md |

---

## Spec-Anchored Acceptance Criteria

Line numbers checked at `cd37f20`. Only `tests/ajustes.spec.js` and `tests/packs-lista.spec.js` changed since `ba7afee` (`git diff --stat ba7afee cd37f20 -- tests`). Citations in other files are the same as in iteration 1.

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| PACK-01 | 9 packs, 7 fields, `precoCentavos` 4990 | `tests/api-mock.spec.js:143-148` ids `toEqual(IDS_PACKS)`, exact keys, `toMatchObject`, `toBe(4990)` | ✅ |
| PACK-02 | 200 per id, 404 otherwise | `tests/api-mock.spec.js:157` `toBe(200)`; `:160` `toBe(404)` | ✅ |
| PACK-03 | 21 presets, valid `packId`, no price | `tests/api-mock.spec.js:34` `toHaveLength(21)`; `:38` exact keys; `:42`; `:46` sizes | ✅ |
| PACK-04 | preset estilo/marca/equipamento = pack's | `tests/api-mock.spec.js:43` `toEqual([pack.estilo, pack.marca, pack.equipamento])` | ✅ |
| LIST-01 | menu "Página Inicial · Packs · Biblioteca" on every page; `aria-current` on packs.html | `tests/packs-lista.spec.js:61-67` texts, href, `aria-current="page"`; `:70-73` loop over `index.html`, **`pack.html?id=rock-boss-gt-1000`**, `biblioteca.html`, `login.html` `toHaveText([...])` (N3 killed) | ✅ (gap closed) |
| LIST-02 | `/presets` starts before `/packs` answers | `tests/packs-lista.spec.js:121-131`; `tests/catalogo.spec.js:54` (M07 killed) | ✅ |
| LIST-03 | fixed error text, retry, no card/count/empty | `tests/carga-estado.spec.js:79-99` | ✅ |
| LIST-04 | "Carregando packs..." in `role=status`, no card | `tests/carga-estado.spec.js:34-35` | ✅ |
| LIST-05 | one card per pack, newest first, name, "{N} presets", price, link | `tests/packs-lista.spec.js:78-97`; `tests/catalogo.spec.js:264-266` | ✅ |
| LIST-06 | filter on `pack.marca`/`pack.estilo`, OR within a group, AND across groups | `tests/packs-lista.spec.js:166-218` (M02 killed) | ✅ (M01 equivalent while PACK-04 holds) |
| LIST-07 | nome/descricao/**equipamento** + preset nome/descricao; case, accents, spaces, literal | `tests/packs-lista.spec.js:226-305`; **`:251-261`** packs whose name leaves out the model, `fill('katana')` → `toEqual(['Pack A'])` (M03 killed) | ✅ (gap closed) |
| LIST-08 | newest/oldest preset date; name A-Z `pt-BR` | `:313` three orders differ; **`:323-335`** `expect(ptBR).not.toEqual(codigos)` then `toEqual(ptBR)` (M24, M24b killed); `:337`, `:342`, `:348` | ✅ (gap closed) |
| LIST-09 | Aplicar without reload; Limpar resets | `tests/packs-lista.spec.js:210-217`; `:360-372` | ✅ |
| LIST-10 | "{N} packs encontrados" / "1 pack encontrado" | `tests/packs-lista.spec.js:381-399`; `:142` "0 packs encontrados" | ✅ |
| LIST-11 | "Nenhum pack encontrado" + hint, no cards | `tests/packs-lista.spec.js:392-399` | ✅ |
| LIST-12 | no preset card | `tests/packs-lista.spec.js:100-107` | ✅ |
| LIST-13 | brands exactly Boss, Line 6, NUX, Zoom | `tests/packs-lista.spec.js:110-118` `toEqual(['boss','line6','nux','zoom'])` (M19 killed) | ✅ |
| HOME-01 | carousel "Packs", one card per pack, newest first, link | `tests/packs-lista.spec.js:413-430` | ✅ |
| HOME-02 | no preset card on home | `tests/packs-lista.spec.js:432-440` | ✅ |
| HOME-03 | home loading/error texts | `tests/carga-estado.spec.js:187`, `:206` | ✅ |
| PAG-01 | `/packs/{id}` + `/presets?packId={id}` in parallel | `tests/pack-pagina.spec.js:30-33`, `:61-66` | ✅ |
| PAG-02 | h1, descricao, price, "{N} presets", list items | `tests/pack-pagina.spec.js:40-54` | ✅ |
| PAG-03 | title "{nome} \| CorsinoTones" | `tests/pack-pagina.spec.js:72` `toHaveTitle('Metal · NUX MG-30 \| CorsinoTones')` | ✅ |
| PAG-04 | no download link | `tests/pack-pagina.spec.js:79-80` | ✅ |
| PAG-05 | malformed/missing id → not found, no request | `tests/pack-pagina.spec.js:84-91` `expect(pedidos).toEqual([])` (M13 killed) | ✅ |
| PAG-06 | 404 → not found | `tests/pack-pagina.spec.js:95-99`; `tests/api-packs.spec.js:50` (M16 killed) | ✅ |
| PAG-07 | error text + retry | `tests/pack-pagina.spec.js:112-118` | ✅ |
| PAG-08 | "Carregando pack..." in status, block hidden | `tests/pack-pagina.spec.js:136-137` | ✅ |
| PAG-09 | block hidden on not-found/error | `tests/pack-pagina.spec.js:23`, `:113`, `:126` | ✅ |
| REM-01 | three files absent | `tests/modulos.spec.js:60-62` | ✅ |
| REM-02 | no link to preset(s).html | `tests/modulos.spec.js:66-72` | ✅ |
| FIX-01 | new home sentence; no "download gratuito" | `tests/ajustes.spec.js:12-19` | ✅ |
| FIX-02 | **any** disabled button: opacity < 1, `not-allowed` | `tests/ajustes.spec.js:21-33` login; **`:36-49`** "Cadastrando..." in `#form-cadastro`; **`:52-63`** a button created on `packs.html`: `toBeLessThan(1)`, `toBe('not-allowed')`; `:66` an enabled button `toBe(1)` (M22, M22b, N4 killed) | ✅ (gap closed) |
| FIX-03 | README: stage 05, packs, scripts, test account, link | `tests/ajustes.spec.js:73-85` `/etapa 05/i`, `/um estilo musical para um único modelo de pedaleira/i`, `not.toMatch(/qualquer equipamento/i)`, script/account/link substrings; **`:87-94`** each `pack.html?id=` in the README returns 200 from `/packs/{id}` (old README, N1, N2 killed). `README.md:4-6`, `:23` now match revision 2 | ✅ (gap closed) |
| FIX-04 | README omits removed files | `tests/ajustes.spec.js:81-83` | ✅ |
| REG-01 | etapa05-auth criteria hold | full gate 233/233 | ✅ |
| REG-02 | etapa05-api-modulos on packs/index | `tests/carga-estado.spec.js`, `tests/modulos.spec.js:21` | ✅ |
| EDGE-01 | malformed ids → not found, no request | `tests/pack-pagina.spec.js:84-91` | ✅ |
| EDGE-02 | one read fails → error | `tests/carga-estado.spec.js:93`; `tests/pack-pagina.spec.js:123-126` | ✅ |
| EDGE-03 | filter checked during load is applied | `tests/carga-estado.spec.js:58-72` | ✅ |

**Status**: ✅ 40/40 covered, each assertion matches the spec outcome. No spec-precision gaps remain.

New tests checked for false passes: the two fulfilled-data tests wait for `#contagem` to show "2 packs encontrados" / "4 packs encontrados" before acting, so they do not read a stale list. The `pt-BR` test first asserts that its names really sort differently by code point, so it cannot turn into a test that passes either way (L-003). The README link test asserts `ids.length > 0`, so it cannot pass when the README cites no link.

---

## Discrimination Sensor

Scratch worktree at `<scratchpad>/wt2` (`git worktree add … HEAD`), with `node_modules` symlinked, `node mock/preparar.js --reset` before each run, and `CI=1`. Each mutant ran only against the spec files that cover the mutated module, and the file was restored after each run (checked with `git diff --quiet`).

| # | File | Mutation | Specs run | Killed by | Result |
| - | ---- | -------- | --------- | --------- | ------ |
| M22 | `frontend/style.css` | `button:disabled` → `#form-login button:disabled` | ajustes | `:36`, `:52` | ✅ Killed |
| M22b | `style.css` | → `form button:disabled` (new) | ajustes | `:52` | ✅ Killed |
| N4 | `style.css` | → `#form-login button:disabled, #form-cadastro button:disabled` (new) | ajustes | `:52` | ✅ Killed |
| M24 | `frontend/paginas/packs.js:66` | name sort by code point (`<`/`>`) | packs-lista, carga-estado | `packs-lista:323` | ✅ Killed |
| M24b | `packs.js:66` | name sort reversed (new) | same | `:313`, `:323`, `:342` | ✅ Killed |
| M03 | `packs.js:48` | search ignores `pack.equipamento` | same | `packs-lista:251` | ✅ Killed (was equivalent) |
| README-old | `README.md` | `git show ba7afee:README.md` | ajustes | `:73`, `:87` | ✅ Killed |
| N1 | `README.md:23` | `pack.html?id=rock-boss` (no such pack) (new) | ajustes | `:87` | ✅ Killed |
| N2 | `README.md:5` | adds "serve para qualquer equipamento" (new) | ajustes | `:73` | ✅ Killed |
| N3 | `frontend/pack.html:17` | menu gets a "Presets" link (new) | packs-lista | `:71` (pack.html) | ✅ Killed |
| M02 | `packs.js:58` | style filter on `pack.id` | packs-lista, carga-estado | `:181`, `:188` | ✅ Killed |
| M05 | `frontend/servicos/catalogo.js:14` | join by `estilo` instead of `packId` | catalogo, packs-lista, carga-estado | 13 tests | ✅ Killed |
| M07 | `catalogo.js:30` | sequential awaits | same | `catalogo:54`, `packs-lista:121` | ✅ Killed |
| M13 | `frontend/paginas/pack.js:12` | regex accepts empty segments (`rock--boss`, `rock-`) | pack-pagina | `:85` ×2 | ✅ Killed |
| M16 | `frontend/api/packs.js:22` | 404 treated as a communication error | api-packs, pack-pagina | `api-packs:50`, `pack-pagina:95` | ✅ Killed |
| M19 | `frontend/packs.html:51` | extra Mooer brand checkbox | packs-lista, carga-estado | `:110` | ✅ Killed |

Earlier mutants not re-run: M01 is still equivalent while PACK-04 holds (guarded by `api-mock.spec.js:43`). The other iteration 1 mutants target code that `cd37f20` did not touch (`git show --stat cd37f20` lists only README, `packs.html` noscript and the two test files).

**Sensor depth**: expanded: 4 gap re-checks (M22, M24, M03, old README), 6 regressions, 6 new mutants on the changed tests and CSS
**Result**: 16 injected, 16 killed, 0 survived. PASS ✅
**Isolation**: real-tree `git status --porcelain` before and after: `.specs/LESSONS.md`, `.specs/features/etapa05-packs/tasks.md`, `.specs/lessons.json` modified, `validation.md` untracked. Only this report changed. The worktree was removed (`git worktree list` shows only the main tree).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code (fix commit changes only README, one noscript string and tests) | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns (Portuguese test names with spec IDs, `nomesVisiveis`, route fulfilment) | ✅ |
| Spec-anchored outcome check | ✅ |
| Per-layer coverage | ✅ |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: none found; strong defaults applied | ✅ |

Note outside the criteria: the noscript copy fix (`packs.html:114`, "ver os packs") is not asserted. `packs-lista:154` only matches `/requer JavaScript/i`. No spec ID requires that exact text.

---

## Edge Cases

- [x] EDGE-01: malformed ids → not found, no request
- [x] EDGE-02: one of two reads failing → error state
- [x] EDGE-03: filter checked during load applied on arrival

---

## Gate Check

- **Gate command**: `npx playwright test` (real tree, `CI=1`, ports 8080/3000 free beforehand)
- **Result**: 233 passed, 0 failed, 0 skipped (45.8 s)
- **Test count before feature**: 180
- **Test count after feature**: 233 (227 at iteration 1, +6 in `cd37f20`: 2 FIX-02, 1 FIX-03, 1 LIST-01 `pack.html`, 1 LIST-07, 1 LIST-08)
- **Delta**: +53
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| All 40 IDs (PACK-01..04, LIST-01..13, HOME-01..03, PAG-01..09, REM-01..02, FIX-01..04, REG-01..02, EDGE-01..03) | Implementing | ✅ Verified |

(spec.md not edited by the Verifier.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 40/40 ACs match the spec outcome; 0 spec-precision gaps
**Sensor**: 16/16 mutations killed
**Gate**: 233 passed

**What works**: everything verified in iteration 1, plus the disabled style on any button, the `pt-BR` name order, model-only search, the menu on the pack page, and a README that describes style + model packs with working links.

**Issues found**: none blocking. Optionally, assert the noscript text.

**Next steps**: update the spec traceability to Verified; the feature is ready for UAT/merge.
