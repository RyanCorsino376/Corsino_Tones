# Interactive Preset List & Login Validation - Validation

**Verdict**: PASS
**Date**: 2026-09-27
**Iteration**: 3 of 3 (fix -> re-verify loop, final)
**Spec**: `.specs/features/etapa04-interatividade/spec.md`
**Diff range**: HEAD d06d9d8 + uncommitted working tree (`git diff HEAD` on `frontend/{index,login,presets}.html`, `frontend/login.js`, `frontend/style.css`, `.specs/STATE.md`; untracked `frontend/{dados,cartao,presets,inicio}.js`, `tests/presets-lista.spec.js`, `tests/login-validacao.spec.js`)
**Verifier**: independent sub-agent (author != verifier)

The iteration-2 survivor V02b is killed. The e-mail anchor tests now put extra text on both sides of a valid address, on both forms, so dropping either anchor fails the suite. The gate is green at 83/83, and all 14 sampled mutants, old and new, are killed. All 27 ACs match their spec outcome.

---

## Iteration 3

### What changed since iteration 2

| Gap | Fix applied (test only) | Evidence |
| --- | ----------------------- | -------- |
| Fix 5: trailing e-mail anchor (V02b) - VAL-01/VAL-02 | The "e-mail rule applies to the whole value" block loops over `['ryan silva@x.com', 'ryan@x.com silva']` on both forms | `tests/login-validacao.spec.js:186` (loop), `:187-192` (registration, `toHaveAttribute('aria-invalid', 'true')` on `#cadastro-email`), `:194-199` (login, same on `#email`) |

No production code changed; `frontend/login.js:42` still holds the spec rule `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

### Spec-anchored check: VAL-01 and VAL-02

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| VAL-01 | Registration rejects name < 2 chars after trim, e-mail not matching `^[^\s@]+@[^\s@]+\.[^\s@]+$` after trim, password < 8 (spec.md:45-46, :116) | Rejects `R`/`ryan@`/`1234567`: `tests/login-validacao.spec.js:41`, `:45` `toHaveAttribute('aria-invalid', 'true')`; accepts boundaries `Ry`/`ryan@x.com`/`12345678`: `:55`, `:58` `not.toHaveAttribute('aria-invalid', 'true')`, `:60` success visible; rejects text before and after a valid address: `:186-191` | ✅ PASS - both anchors, both length boundaries pinned |
| VAL-02 | Login rejects an e-mail not matching the rule and an empty password; no 8-char rule (spec.md:44, :117) | Rejects `ryan@x`/`''`: `tests/login-validacao.spec.js:123`, `:126` `aria-invalid="true"`; accepts `123`: `:136`, `:138-139`; rejects text before and after a valid address: `:186`, `:194-198` | ✅ PASS |

Implementation reference: `frontend/login.js:42` (rule), `:48` and `:51` (both forms use it), `:49` (login password: empty only), `:52` (registration password: 8 chars).

The other 25 ACs have no code or test change since iteration 2 and re-ran green in the full gate below; their evidence stands as recorded in iterations 1 and 2.

### Discrimination sensor (iteration 3)

Isolated copy under the session scratchpad (`iso3/`): `frontend`, `tests`, `imagens`, `playwright.config.js`, `package.json` copied, `node_modules` symlinked. Each mutant restores a pristine `frontend/`, applies one exact-match textual fault (the script asserts a single occurrence), and runs the owning spec file sequentially with `CI=1 --reporter=list`. Results read from the `N failed` line and the `✘` rows.

| # | File:line | Fault | Result | Killing test(s) |
| - | --------- | ----- | ------ | --------------- |
| V02b | `frontend/login.js:42` | Only trailing `$` dropped | ✅ Killed (2 failed) | `login-validacao.spec.js:187`, `:194` ("ryan@x.com silva") |
| V02 | `frontend/login.js:42` | Both anchors dropped | ✅ Killed (4 failed) | `:187`, `:194` (both values) |
| V02c | `frontend/login.js:42` | Local part allows spaces (`[^@]+`) | ✅ Killed (2 failed) | `:187`, `:194` ("ryan silva@x.com") |
| V02d | `frontend/login.js:42` | Only leading `^` dropped (new) | ✅ Killed (2 failed) | `:187`, `:194` ("ryan silva@x.com") |
| V02e | `frontend/login.js:42` | TLD part allows spaces (`\.[^@]+$`) (new) | ✅ Killed (2 failed) | `:187`, `:194` ("ryan@x.com silva") |
| M12 | `frontend/presets.js:48` | A-Z by code point | ✅ Killed (2 failed) | `presets-lista.spec.js:274`, `:292` |
| M14 | `frontend/presets.js:54` | `=== 1` -> `<= 1` ("0 preset encontrado") | ✅ Killed (1 failed) | `presets-lista.spec.js:338` |
| V19 | `frontend/login.js:52` | Registration password message in English | ✅ Killed (1 failed) | `login-validacao.spec.js:205` |
| V03 | `frontend/login.js:52` | Password rule 8 -> 7 | ✅ Killed (4 failed) | `login-validacao.spec.js:40`, `:83`, `:149`, `:205` |
| V16 | `frontend/login.js:49` | Login applies 8-char rule | ✅ Killed (1 failed) | `login-validacao.spec.js:135` |
| M01 | `frontend/presets.js:40` | OR -> AND inside brand group | ✅ Killed (1 failed) | `presets-lista.spec.js:136` |
| M19 | `frontend/presets.js:75` | Aplicar submit not prevented | ✅ Killed (2 failed) | `presets-lista.spec.js:175`, `:236` |
| M04 | `frontend/presets.js:15` | Accent folding dropped (no NFD) | ✅ Killed (2 failed) | `presets-lista.spec.js:202`, `:225` |

**Sensor depth**: expanded (13 mutants: the survivor, 4 anchor variants, 8 previously killed).
**Result**: 13/13 killed - PASS.

**Isolation**: after the sensor, `diff -r` of the scratch `frontend/` against the real `frontend/` is clean. The real tree's `git status --porcelain` matches the pre-sensor baseline except for one new untracked directory, `docs/evidencias/etapa-04/` (7 PNG screenshots, created 13:14 during the run). No test or config references that path, and the sensor wrote only inside the scratchpad, so it comes from the parallel documentation work, not from this verification.

### Gate check (iteration 3)

- **Command**: `CI=1 npx playwright test --reporter=list` (repo root)
- **Result**: 83 passed, 0 failed, 0 skipped (16.4s)
- **Pre-feature suites**: `CI=1 npx playwright test tests/login-flip.spec.js tests/responsive.spec.js` -> 38 passed (7.0s)
- **Delta vs iteration 2**: +2 (the "ryan@x.com silva" case on each form); no test removed or weakened

### Requirement traceability (iteration 3)

| Requirement | Iteration 2 | Iteration 3 |
| ----------- | ----------- | ----------- |
| VAL-01, VAL-02 | ❌ Needs Fix (trailing anchor) | ✅ Verified |
| All other ACs | ✅ Verified | ✅ Verified |

### Observations (not gaps)

- Nothing is committed yet; the execution contract (one atomic commit per task) is still open. This is a process item for the orchestrator, not a behaviour gap.
- spec.md traceability rows still read "Implementing" (e.g. spec.md:158-159 for VAL-01/VAL-02); the orchestrator should move them to Verified when committing.

### Lessons

Clean PASS: no surviving mutants, no spec-precision gaps, no deviations this round, so nothing new is recorded (lessons.md: "a clean run produces no lessons"). L-002 already holds the one-sided-anchor evidence from iteration 2.

### Summary (iteration 3)

**Overall**: ✅ Ready.
**Spec-anchored check**: 27/27 ACs match their spec outcome.
**Sensor**: 13/13 killed.
**Gate**: 83 passed.

---

## Iteration 2 (record, superseded where iteration 3 says so)

Verdict of iteration 2: FAIL - 1 survivor (V02b) out of 19 mutants, gate 81/81.


### What changed since iteration 1

| Gap | Fix applied | Evidence |
| --- | ----------- | -------- |
| EMPTY-01 zero case (M14) | Empty-state test asserts the zero count | `tests/presets-lista.spec.js:347` - `toHaveText('0 presets encontrados')` |
| E-mail anchors (V02) | Rejection of `ryan silva@x.com` on both forms | `tests/login-validacao.spec.js:188-190` (registration), `:195-197` (login) - `toHaveAttribute('aria-invalid', 'true')` |
| FILT-07 collation (M12) | Sample renamed to "Ápice do Solo"; spec assumption "Name order sample" | `frontend/dados.js:62`; spec.md:38 |
| VAL-03 language (V19) | Spec assumption "Field messages" fixes the four texts; VAL-03 now points to it; exact-text tests | spec.md:47, spec.md:119; `tests/login-validacao.spec.js:207-209`, `:216-217` |

### Spec-anchored check for the changed ACs

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| EMPTY-01 | Live region: "1 preset encontrado" / "N presets encontrados" (spec.md:102) | `tests/presets-lista.spec.js:326` `aria-live="polite"`; `:327` N=9; `:334` N=1; `:347` N=0 `toHaveText('0 presets encontrados')` | ✅ PASS - one, many and zero pinned |
| FILT-07 | A-Z with `pt-BR` collation; sample holds an accented initial (spec.md:38) | `frontend/dados.js:62` "Ápice do Solo"; `tests/presets-lista.spec.js:278-279` expected from `localeCompare(b, 'pt-BR')` `toEqual`; `:296-297` same for filtered list | ✅ PASS - code-point sort (M12) and lower-case code-point sort (M12b) both fail these tests |
| VAL-01 | Reject name < 2, e-mail not matching `^[^\s@]+@[^\s@]+\.[^\s@]+$` after trim, password < 8 (spec.md:46, :117) | `tests/login-validacao.spec.js:45` rejects `R`/`ryan@`/`1234567`; `:58` accepts `Ry`/`ryan@x.com`/`12345678`; `:190` rejects `ryan silva@x.com` | ⚠️ GAP - trailing anchor `$` not discriminated (V02b survives) |
| VAL-02 | Login rejects e-mail not matching the rule and empty password; no 8-char rule (spec.md:118) | `tests/login-validacao.spec.js:126-127` rejects `ryan@x`/`''`; `:138` accepts `123`; `:197` rejects `ryan silva@x.com` | ⚠️ GAP - same trailing-anchor hole as VAL-01 |
| VAL-03 | The "Field messages" text next to the field, `aria-invalid="true"`, linked by `aria-describedby` (spec.md:47, :119) | `tests/login-validacao.spec.js:207-209`, `:216-217` - `toBe(<exact spec text>)` read through `aria-describedby` (helper `:8-13`); `:45` `aria-invalid`; `:89` one `.erro-campo` per fieldset | ✅ PASS - all four spec messages pinned verbatim |

The remaining 22 ACs are unchanged since iteration 1 (see the iteration-1 table below); the full gate re-ran them green.

### Discrimination sensor (iteration 2)

Isolated copy under the session scratchpad: `frontend`, `tests`, `imagens`, `playwright.config.js`, `package.json` copied, `node_modules` symlinked. Each mutant restores a pristine `frontend/`, applies one textual fault, and runs the owning spec file with `CI=1 --reporter=list` (fresh web server each run; failures read from the `N failed` line and the `✘` rows).

| # | File:line | Fault | Result | Killing test |
| - | --------- | ----- | ------ | ------------ |
| M14 | `frontend/presets.js:54` | `=== 1` -> `<= 1` ("0 preset encontrado") | ✅ Killed | `presets-lista.spec.js:338` |
| M12 | `frontend/presets.js:48` | A-Z by code point | ✅ Killed | `presets-lista.spec.js:274`, `:292` |
| M12b | `frontend/presets.js:48` | A-Z by lower-cased code point | ✅ Killed | `presets-lista.spec.js:274`, `:292` |
| V02 | `frontend/login.js:42` | Both anchors dropped | ✅ Killed | `login-validacao.spec.js:186`, `:193` |
| V02b | `frontend/login.js:42` | Only trailing `$` dropped | ❌ Survived | - |
| V02c | `frontend/login.js:42` | Local part allows spaces (`[^@]+`) | ✅ Killed | `login-validacao.spec.js:186`, `:193` |
| V19 | `frontend/login.js:52` | Registration password message in English | ✅ Killed | `login-validacao.spec.js:203` |
| V19b | `frontend/login.js:49` | Login password message in English | ✅ Killed | `login-validacao.spec.js:212` |
| V19c | `frontend/login.js:50` | Name message shortened | ✅ Killed | `login-validacao.spec.js:203` |
| V19d | `frontend/login.js:43` | E-mail message changed | ✅ Killed | `login-validacao.spec.js:203`, `:212` |
| M01 | `frontend/presets.js:40` | OR -> AND inside brand group | ✅ Killed | `presets-lista.spec.js:136` |
| M04 | `frontend/presets.js:15` | Accent folding dropped | ✅ Killed | `presets-lista.spec.js:202`, `:225` |
| M11 | `frontend/presets.js:47` | Oldest-first reversed | ✅ Killed | `presets-lista.spec.js:266` |
| M15 | `frontend/presets.js:55` | Plural used for 1 | ✅ Killed | `presets-lista.spec.js:331` |
| M19 | `frontend/presets.js:75` | Aplicar submit not prevented | ✅ Killed | `presets-lista.spec.js:175`, `:236` |
| V01 | `frontend/login.js:42` | Dot after `@` not required | ✅ Killed | `login-validacao.spec.js:122`, `:164`, `:212` |
| V03 | `frontend/login.js:52` | Password rule 8 -> 7 | ✅ Killed | `login-validacao.spec.js:40`, `:83`, `:149` |
| V08 | `frontend/login.js:103` | Focus first field, not first rejected | ✅ Killed | `login-validacao.spec.js:64` |
| V16 | `frontend/login.js:49` | Login applies 8-char rule | ✅ Killed | `login-validacao.spec.js:135` |

**Sensor depth**: expanded (19 mutants: the 4 iteration-1 survivors, 6 variants around them, 9 previously killed).
**Outcome (iteration 2)**: 18/19 killed - FAIL (V02b).

**Isolation**: `git status --porcelain` of the real tree identical to the pre-sensor baseline; `diff -r frontend <pristine copy>` clean.

### Gate check (iteration 2)

- **Command**: `CI=1 npx playwright test` (repo root)
- **Result**: 81 passed, 0 failed, 0 skipped (15.8s)
- **Per file**: `login-flip.spec.js` 16, `responsive.spec.js` 22 (the 38 pre-feature tests, all green), `presets-lista.spec.js` 27, `login-validacao.spec.js` 16
- **Delta vs iteration 1**: +4 (two e-mail anchor tests, two message-wording tests); no test removed or weakened

### Fix plan (iteration 2)

#### Fix 5 (Minor): trailing e-mail anchor not discriminated - VAL-01/VAL-02
- **Root cause**: the anchor tests put invalid text only before the valid part. With `$` removed, `ryan@x.com silva` is accepted, although the spec's rule (spec.md:46) rejects it.
- **Fix task**: in the "e-mail rule applies to the whole value" block of `tests/login-validacao.spec.js` (`:183-199`), also reject `ryan@x.com silva` on both forms (assert `aria-invalid="true"`).
- **Kills**: V02b.

### Requirement traceability (iteration 2)

| Requirement | Iteration 1 | Iteration 2 |
| ----------- | ----------- | ----------- |
| EMPTY-01 | ❌ Needs Fix | ✅ Verified |
| FILT-07 | ⚠️ Needs Fix | ✅ Verified |
| VAL-03 | ⚠️ Needs Fix | ✅ Verified |
| VAL-01, VAL-02 | ❌ Needs Fix | ❌ Needs Fix (trailing anchor only) |
| All other ACs | ✅ Verified | ✅ Verified |

### Lessons

L-001, L-003 and L-004 are satisfied for this feature (their mutants are now killed); they stay candidates, because promotion needs a second feature and `lessons.py` has no resolve command. V02b is a repeat of the L-002 pattern (only one side of the anchor was embedded), so it was recorded against L-002 as new evidence.

### Summary (iteration 2)

**Overall**: ❌ Not Ready - one test to add.
**Spec-anchored check**: 25/27 ACs match their spec outcome; VAL-01 and VAL-02 share one gap.
**Sensor**: 18/19 killed.
**Gate**: 81 passed.
**Next step**: apply Fix 5, re-run the Verifier (iteration 3 of 3).

---

## Iteration 1 (record, superseded where iteration 2 says so)

Verdict of iteration 1: FAIL - 4 survivors (M14, V02, M12, V19) out of 44 non-equivalent mutants, gate 77/77.

---

### Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Catalogue + cards + noscript |
| T2 | ✅ Done | Home carousel |
| T3 | ✅ Done | Brand/style filters |
| T4 | ✅ Done | Text search |
| T5 | ✅ Done | Sort + Limpar |
| T6 | ⚠️ Done, weak test | Zero-match count text not asserted (M14 survives) |
| T7 | ⚠️ Done, weak test | Unanchored e-mail regex not detected (V02 survives) |
| T8 | ✅ Done | Live clearing |

Nothing is committed yet; the execution contract (one commit per task) is not met. Recorded as an observation, not a gap in behaviour.

---

### Spec-Anchored Acceptance Criteria

Test files: `tests/presets-lista.spec.js` (L), `tests/login-validacao.spec.js` (V), `tests/login-flip.spec.js` (F).

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| CAT-01 | Array of 9 objects, 7 fields | `tests/presets-lista.spec.js:23` - `expect(presets).toHaveLength(9)`; `:26` - `expect(preset[campo]).toBeTruthy()` for all 7 fields | ✅ PASS |
| CAT-02 | One card per entry in `.grade-presets`, newest first | `tests/presets-lista.spec.js:57` - `toHaveCount(esperado.length)`; `:60` - names `toEqual` date-desc order | ✅ PASS |
| CAT-03 | Name, brand + equipment, style; href `preset.html` | `tests/presets-lista.spec.js:73-78` - `toContain(nome/equipamento/marca/estilo)`; `:79` - `toHaveAttribute('href', 'preset.html')` | ✅ PASS (brand/style compared by lowercase key vs label, loose but killed M21) |
| CAT-04 | Carousel shows catalogue newest first | `tests/presets-lista.spec.js:102` - `toHaveCount`; `:105` - names `toEqual` date-desc | ✅ PASS |
| CAT-05 | No-JS message that list requires JS | `tests/presets-lista.spec.js:91` - `getByText(/requer JavaScript/i)).toBeVisible()` | ✅ PASS |
| FILT-01 | Only checked brands (OR), no reload | `tests/presets-lista.spec.js:132` (one brand), `:141` (boss OR nux) - `toEqual(esperado.sort())` | ✅ PASS |
| FILT-02 | Only checked styles | `tests/presets-lista.spec.js:150` - `toEqual(esperado.sort())` | ✅ PASS |
| FILT-03 | Brand AND style | `tests/presets-lista.spec.js:160` - power guard `e.length < ou.length`; `:161` - `toEqual(e.sort())` | ✅ PASS |
| FILT-04 | Empty group does not restrict | `tests/presets-lista.spec.js:171` - `toHaveCount(9)` | ✅ PASS |
| FILT-05 | nome/equipamento/descricao; case, accent, whitespace-insensitive | `tests/presets-lista.spec.js:207` (DISTORCAO), `:214` (`'  hx stomp  '`), `:232` (AND with brand) | ✅ PASS |
| FILT-06 | Whitespace-only search does not restrict | `tests/presets-lista.spec.js:221` - `toHaveCount(9)` | ✅ PASS |
| FILT-07 | Newest, oldest, A-Z (`pt-BR` collation) | `tests/presets-lista.spec.js:270` (oldest), `:279` (A-Z with `localeCompare(..., 'pt-BR')`), `:288` (newest), `:297` (sort after filter) | ⚠️ Spec-precision gap: sample names sort identically under code point and pt-BR; mutant M12 survives |
| FILT-08 | "Aplicar" updates, no reload | `tests/presets-lista.spec.js:182-185` - URL unchanged, `window.semRecarregar` survives, list filtered; Enter in search `:241` | ✅ PASS |
| FILT-09 | Limpar: unchecked, empty search, newest first, all shown | `tests/presets-lista.spec.js:309-314` - 0 checked, `toHaveValue('')`, `toHaveValue('recentes')`, 9 cards, date-desc order | ✅ PASS |
| EMPTY-01 | Live region: "1 preset encontrado" / "N presets encontrados" | `tests/presets-lista.spec.js:326` - `aria-live="polite"`; `:327` - `'9 presets encontrados'`; `:334` - `'1 preset encontrado'` | ❌ GAP: N=0 never asserted; M14 ("0 preset encontrado") survives |
| EMPTY-02 | "Nenhum preset encontrado" + clear hint, no cards | `tests/presets-lista.spec.js:343-345` - 0 cards, text visible, `.lista-vazia` contains "Limpar" | ✅ PASS |
| EMPTY-03 | Message removed when matches return | `tests/presets-lista.spec.js:355` - `toBeHidden()`; `:356-357` - 9 cards, count text | ✅ PASS |
| VAL-01 | Name < 2, bad e-mail, password < 8 rejected | `tests/login-validacao.spec.js:45` - 3x `aria-invalid="true"` for `R`/`ryan@`/`1234567`; boundary accept `:58` for `Ry`/`ryan@x.com`/`12345678` | ✅ PASS (e-mail rule: see V02) |
| VAL-02 | Login: bad e-mail, empty password rejected; no 8-char rule | `tests/login-validacao.spec.js:126-127` - `aria-invalid` + message for `ryan@x`/`''`; `:138` - `123` accepted | ✅ PASS |
| VAL-03 | Portuguese message next to field, `aria-invalid`, `aria-describedby` | `tests/login-validacao.spec.js:47-49` - linked messages via `aria-describedby`, 3 distinct; `:89` - one `.erro-campo` inside each fieldset (placement) | ⚠️ Spec-precision gap: "Portuguese" not asserted; V19 survives |
| VAL-04 | Not submitted; focus on first rejected field | `tests/login-validacao.spec.js:50` - `#cadastro-nome` focused; `:69` - `#cadastro-email` focused when name valid; `:112` - success hidden | ✅ PASS |
| VAL-05 | Fixing a field clears its message and `aria-invalid` live | `tests/login-validacao.spec.js:155-160` - no `aria-invalid`, no `aria-describedby`, message gone, other two remain; `:169` still-invalid keeps message; `:178-179` no message before submit | ✅ PASS |
| VAL-06 | Valid submit: no reload, success message on that face | `tests/login-validacao.spec.js:100-103` - visible, non-empty, URL unchanged, `semRecarregar` true | ✅ PASS |
| VAL-07 | Card flip unchanged | `tests/login-flip.spec.js:59`, `:64`, `:75`, `:101`, `:128` (16 tests, all green in full gate) | ✅ PASS |
| EDGE-01 | Regex characters literal, no throw | `tests/presets-lista.spec.js:252` - `toHaveCount(0)` for `(`, `.*`, `[`; `:254` - `expect(erros).toEqual([])` | ✅ PASS |
| EDGE-02 | Whitespace-only = empty | `tests/login-validacao.spec.js:78` - 3x `aria-invalid` for whitespace-only; search side `tests/presets-lista.spec.js:221` | ✅ PASS |
| EDGE-03 | Resubmit shows each message once | `tests/login-validacao.spec.js:89` - `.erro-campo` `toHaveCount(1)` per fieldset | ✅ PASS |

**Status**: 27/27 traced; 1 gap (EMPTY-01 zero case), 2 spec-precision gaps (FILT-07 collation, VAL-03 language), 1 weak e-mail assertion under VAL-01/VAL-02 (V02).

---

### Discrimination Sensor

Isolated copy: repo tarred (without `.git`, `node_modules` symlinked) into the session scratchpad; each mutant restores a pristine `frontend/`, applies one textual fault, runs the owning spec file with `CI=1` (fresh web server from the copy, never reusing a server). Sensor depth: expanded (45 mutants).

| # | File:line | Fault | Result |
| - | --------- | ----- | ------ |
| M01 | `frontend/presets.js:40` | OR -> AND inside brand group | ✅ Killed |
| M02 | `frontend/presets.js:40` | AND -> OR across groups | ✅ Killed |
| M03 | `frontend/presets.js:41` | Empty style group restricts | ✅ Killed |
| M04 | `frontend/presets.js:15` | Accent folding dropped | ✅ Killed |
| M05 | `frontend/presets.js:15` | Case folding dropped | ✅ Killed |
| M06 | `frontend/presets.js:27` | Search trim dropped | ✅ Killed |
| M07 | `frontend/presets.js:33` | Search ignores `equipamento` | ✅ Killed |
| M08 | `frontend/presets.js:33` | Search ignores `descricao` | ✅ Killed |
| M09 | `frontend/presets.js:34` | Search via `new RegExp(texto)` | ✅ Killed |
| M10 | `frontend/presets.js:49` | Default order dropped | ✅ Killed |
| M11 | `frontend/presets.js:47` | Oldest-first reversed | ✅ Killed |
| M12 | `frontend/presets.js:48` | A-Z by code point, not `pt-BR` collation | ❌ Survived |
| M13 | `frontend/cartao.js:28` | `ordenarMaisRecentes` does not sort | ✅ Killed |
| M14 | `frontend/presets.js:54` | Singular used for 0 ("0 preset encontrado") | ❌ Survived |
| M15 | `frontend/presets.js:55` | Plural used for 1 | ✅ Killed |
| M16 | `frontend/presets.js:57` | Empty state never hidden | ✅ Killed |
| M17 | `frontend/presets.js:57` | Empty state never re-hidden | ✅ Killed |
| M18 | `frontend/presets.js:71` | Limpar does not redraw | ✅ Killed |
| M19 | `frontend/presets.js:75` | Aplicar submit not prevented (reload) | ✅ Killed |
| M20 | `frontend/cartao.js:7` | Card link changed | ✅ Killed |
| M21 | `frontend/cartao.js:21` | Card omits style | ✅ Killed |
| M22 | `frontend/inicio.js:6` | Carousel not sorted | ✅ Killed |
| M23 | `frontend/presets.html:127` | `<noscript>` message removed | ✅ Killed |
| M24 | `frontend/presets.js:67` | Search `input` listener removed | ✅ Killed |
| V01 | `frontend/login.js:42` | E-mail regex: dot after @ not required | ✅ Killed |
| V02 | `frontend/login.js:42` | E-mail regex: `^`/`$` anchors dropped | ❌ Survived |
| V03 | `frontend/login.js:52` | Password rule 8 -> 7 | ✅ Killed |
| V04 | `frontend/login.js:52` | Password rule 8 -> 9 | ✅ Killed |
| V05 | `frontend/login.js:50` | Name rule 2 -> 1 | ✅ Killed |
| V06 | `frontend/login.js:62` | No trim before rules | ✅ Killed |
| V07 | `frontend/login.js:103` | No focus move | ✅ Killed |
| V08 | `frontend/login.js:103` | Focus first field, not first rejected | ✅ Killed |
| V09 | `frontend/login.js:69` | Duplicate message on resubmit | ✅ Killed |
| V10 | `frontend/login.js:110` | Input listener validates untouched fields | ✅ Killed |
| V11 | `frontend/login.js:111` | Input listener clears any field | ✅ Killed |
| V12 | `frontend/login.js:101` | Success never shown | ✅ Killed |
| V13 | `frontend/login.js:101` | `hidden=false` on invalid (text stays empty) | ➖ Survived, equivalent (empty `<p>` shows nothing) |
| V13b | `frontend/login.js:101-102` | Success text shown on invalid submit | ✅ Killed |
| V14 | `frontend/login.js:77` | No `aria-describedby` | ✅ Killed |
| V15 | `frontend/login.js:89` | Submit not prevented | ✅ Killed |
| V16 | `frontend/login.js:49` | Login applies 8-char rule | ✅ Killed |
| V17 | `frontend/login.js:84` | `limparErro` keeps `aria-describedby` | ✅ Killed |
| V18 | `frontend/login.js:73` | Message appended to form, not next to field | ✅ Killed |
| V19 | `frontend/login.js:52` | Password message in English | ❌ Survived |

**Outcome (iteration 1)**: 40/45 killed; 40/44 excluding the equivalent V13. Survivors: M12, M14, V02, V19 - FAIL.

**Isolation**: `git status --porcelain` of the real tree matched the baseline for every pre-existing entry; `frontend/` and `tests/` diff clean against the pre-sensor copy. One new entry appeared during the run, `?? docs/etapa-04.md` (empty file, mtime 12:28:52), created outside the sensor (the sensor writes only under the scratchpad). Not touched by the Verifier.

---

### Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (`style.css` +132 lines for new controls; not exercised by feature tests beyond visibility) |
| No scope creep | ✅ |
| Matches patterns | ✅ IIFE per page, `defer` scripts, same as `login.js` |
| Spec-anchored outcome check | ⚠️ 3 items (EMPTY-01 zero, FILT-07 collation, VAL-03 language) |
| Per-layer coverage | ✅ e2e covers happy + edge + error per page |
| Every test maps to a requirement | ✅ (the "every brand appears" test maps to the Assumptions table) |
| Documented guidelines followed | ✅ `playwright.config.js` comments; `.specs/STATE.md` AD-006/AD-007 |

---

### Edge Cases

- [x] EDGE-01: regex characters literal - `presets.js:171-174` uses `includes`; tested and M09 killed
- [x] EDGE-02: whitespace-only is empty - both forms and search; V06/M06 killed
- [x] EDGE-03: no duplicate messages - V09 killed

---

### Gate Check

- **Gate command**: `npx playwright test` (run with `CI=1`)
- **Result**: 77 passed, 0 failed, 0 skipped
- **Test count before feature**: 38 (`login-flip` + `responsive`)
- **Test count after feature**: 77
- **Delta**: +39 (27 in `presets-lista.spec.js`, 12 in `login-validacao.spec.js`)
- **Skipped tests**: none
- **Failures**: none

---

### Fix Plans

### Fix 1 (Major): zero-match count text untested - EMPTY-01
- **Root cause**: the plural form is asserted only for 9; the 0 case (the empty state itself) is never checked.
- **Fix task**: in the EMPTY-02 test (`tests/presets-lista.spec.js:338`), add `await expect(page.getByRole('status')).toHaveText('0 presets encontrados')`.
- **Kills**: M14.

### Fix 2 (Major): e-mail rule anchors not discriminated - VAL-01/VAL-02
- **Root cause**: rejected samples (`ryan@`, `ryan@x`) fail any `@x.y` pattern; nothing checks that surrounding text or spaces are rejected.
- **Fix task**: add a rejection case with a valid address embedded in invalid text, e.g. `'ryan silva@x.com'` or `'@@ryan@x.com'`, on both forms.
- **Kills**: V02.

### Fix 3 (Minor, spec-precision): pt-BR collation not observable - FILT-07
- **Root cause**: the nine sample names give the same order under code-point and pt-BR comparison.
- **Fix task**: either add a test that sorts a name starting with an accented or lowercase letter against ASCII names (requires a sample preset such as "Ácido ..." or a test-only catalogue injected before scripts run), or relax FILT-07 in the spec to "alphabetical".
- **Kills**: M12.

### Fix 4 (Minor, spec-precision): "Portuguese message" not asserted - VAL-03
- **Root cause**: tests deliberately avoid wording; the language requirement is untested.
- **Fix task**: pin the minimum observable (e.g. each message `toMatch(/informe|senha|e-mail|nome/i)`), or record in the spec that wording is out of automated scope.
- **Kills**: V19.

---

### Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CAT-01..05 | Implementing | ✅ Verified |
| FILT-01..06, FILT-08, FILT-09 | Implementing | ✅ Verified |
| FILT-07 | Implementing | ⚠️ Needs Fix (spec-precision) |
| EMPTY-01 | Implementing | ❌ Needs Fix |
| EMPTY-02, EMPTY-03 | Implementing | ✅ Verified |
| VAL-01, VAL-02 | Implementing | ❌ Needs Fix (e-mail anchors) |
| VAL-03 | Implementing | ⚠️ Needs Fix (spec-precision) |
| VAL-04..07 | Implementing | ✅ Verified |
| EDGE-01..03 | Implementing | ✅ Verified |

---

### Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 27/27 traced; 1 gap + 2 spec-precision gaps
**Sensor**: 40/44 non-equivalent mutants killed (4 survived)
**Gate**: 77 passed

**What works**: data-driven catalogue and carousel, faceted filter semantics, accent/case-insensitive literal search, all three orders, Limpar/Aplicar without reload, empty state show/hide, all validation rules at their boundaries, focus, live clearing, no duplicates, flip unchanged.

**Next steps**: route Fix 1 and Fix 2 as test-only fix tasks; decide Fix 3 and Fix 4 at spec level; re-run the Verifier.
