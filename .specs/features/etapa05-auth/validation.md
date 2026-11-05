# etapa05-auth Validation (iteration 3)

**Date**: 2026-11-05
**Spec**: `.specs/features/etapa05-auth/spec.md` (32 requirement IDs)
**Diff range**: `df253c8..2f7b90c` (feature); iteration 3 delta `4a530ff..2f7b90c` (`2f7b90c`: PROT-01 test only, plus tasks.md)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: FAIL

## History

- **Iteration 1** (`df253c8..9feb18f`): FAIL. Survivors M02 (case-insensitive password compare) and M13 (`location.assign` instead of `replace` after a successful sign-in/registration); precision note on SES-04. Fixed in `4a530ff` (tests + spec assumption).
- **Change request T9** (`7461114`): signed-out `biblioteca.html` shows a modal `<dialog>` instead of redirecting; PROT-01 rewritten, PROT-05 extended, PROT-06/07 added.
- **Iteration 2** (`..4a530ff`): FAIL. M02/M13 killed; survivor P07 (`setTimeout(() => location.replace('login.html?voltar=biblioteca.html'), 1500)` after `pedirLogin`), because PROT-01's "SHALL NOT change the location by itself" was checked at one instant.
- **Iteration 3** (`..2f7b90c`): the PROT-01 test now installs `page.clock`, runs 60 s, and asserts URL, dialog visibility and the main-frame navigation list. P07 and three timer variants are killed. A new variant, P07e (a `<meta http-equiv="refresh">` injected by the page), survives: it navigates on the real wall clock, which `page.clock` does not control, and the test finishes before it fires.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T8 | ✅ Done | T8 redirect tests superseded by T9 (user change request) |
| T9 Sign-in pop-up | ⚠️ Done, one test gap | PROT-01 "by itself" pinned for JS timers only (P07e survived) |
| Verifier Fixes (iteration 1) | ✅ Done | M02, M13 killed again this iteration |
| Verifier Fixes (iteration 2) | ✅ Done | P07, P07b, P07c, P07d killed |

`tasks.md` header: "Status: Done (pending Verifier iteration 3)".

---

## Spec-Anchored Acceptance Criteria

Only `tests/cabecalho.spec.js` changed since iteration 2 (5 lines inserted after line 73 and 5 after old line 81). All other citations were re-checked against HEAD and are unchanged; `tests/cabecalho.spec.js` citations below use HEAD line numbers.

### Registration (CAD)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| CAD-01 | Field messages shown; no request sent | `tests/login-validacao.spec.js:130-136` - `toHaveAttribute('aria-invalid','true')` + `expect(pedidos).toEqual([])`; texts `:58`, `:230` | ✅ PASS |
| CAD-02 | `POST /usuarios` with trimmed `nome`, trimmed+lowercased `email`, `senha` | `tests/auth.spec.js:71` - `postDataJSON()).toEqual({ nome: 'Ana', email, senha: 'senha1234' })`; `tests/api-usuarios.spec.js:67-68` | ✅ PASS |
| CAD-03 | "Este e-mail já está cadastrado." beside the field, `aria-invalid="true"`, no POST | `tests/login-api.spec.js:196-199`; `tests/auth.spec.js:83-84` | ✅ PASS |
| CAD-04 | Session for the new account; redirect as PROT-02 | `tests/login-api.spec.js:174-178`, `:182-185`; replace `:260-269` `history.length` `toBe(tamanhoAntes)` | ✅ PASS (M13 killed) |
| CAD-05 | Connection message in `role="alert"` in the form; values kept | `tests/login-api.spec.js:211-214`, `:223` | ✅ PASS |
| CAD-06 | "Cadastrar" disabled, "Cadastrando..." while pending | `tests/login-api.spec.js:233-234` - `toBeDisabled()`, `toHaveText('Cadastrando...')` | ✅ PASS |

### Login (AUTH)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AUTH-01 | Field messages; no request | `tests/login-validacao.spec.js:146-155`, `:239` | ✅ PASS |
| AUTH-02 | `GET /usuarios?email=` trimmed+lowercased | `tests/login-api.spec.js:53` - `search).toBe('?email=ryan%40exemplo.com')` | ✅ PASS |
| AUTH-03 | Session when `senha` equals the typed password | `tests/login-api.spec.js:42-43`; exactness `tests/auth.spec.js:50` - `'TESTE123'` → `{ ok: false, erro: 'CredenciaisInvalidas' }` | ✅ PASS (M02 killed) |
| AUTH-04 | "E-mail ou senha incorretos." in `role="alert"`; no session; password cleared | `tests/login-api.spec.js:77-81`, `:88-89`; `tests/auth.spec.js:45,55` | ✅ PASS |
| AUTH-05 | Connection message; values kept | `tests/login-api.spec.js:98-101` | ✅ PASS |
| AUTH-06 | "Login" disabled, "Entrando..." while pending | `tests/login-api.spec.js:111-112` | ✅ PASS |

### Session and header (SES)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| SES-01 | `corsino:sessao` = `{ id, nome, email }`, never `senha` | `tests/sessao.spec.js:30` exact JSON `toBe(...)`; `tests/login-api.spec.js:43,178` | ✅ PASS (M01 killed) |
| SES-02 | "Olá, {first word}" + "Sair" on the 4 pages | `tests/cabecalho.spec.js:27-29`; biblioteca `:123` | ✅ PASS |
| SES-03 | "Entrar" link to `login.html` without a session | `tests/cabecalho.spec.js:36-38` | ✅ PASS |
| SES-04 | "Sair" removes the key, `location.assign('index.html')`, "Entrar" shown | `tests/cabecalho.spec.js:49-51` | ✅ PASS |
| SES-05 | Name as text, never HTML | `tests/cabecalho.spec.js:62-64` | ✅ PASS (M09 killed) |

### Protected library (PROT)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| PROT-01 (revised) | Modal dialog with "Faça login para acessar sua biblioteca", "Fazer login" and "Voltar"; **SHALL NOT change the location by itself** | `tests/cabecalho.spec.js:82-86` (dialog visible, text, both buttons, `:modal` true); `:89-92` - `page.clock.runFor(60_000)`, `toHaveURL(/\/frontend\/biblioteca\.html$/)`, dialog `toBeVisible()`, `navegacoes` `toEqual(['/frontend/biblioteca.html'])` | ❌ GAP: JS-timer redirects up to 60 s are now caught (P07/P07b/P07c/P07d killed), but a declarative `<meta http-equiv="refresh">` runs on the real clock and fires after the test ends (P07e survived) |
| PROT-02 | After success, **replace** with valid `voltar` or `index.html` | `tests/login-api.spec.js:42,61,68,174,185`, `tests/cabecalho.spec.js:137`; replace `tests/login-api.spec.js:256,258,268` | ✅ PASS (M13 killed) |
| PROT-03 | `voltar` not matching `^[a-z0-9-]+\.html$` treated as absent | `tests/sessao.spec.js:60,67`; `tests/login-api.spec.js:68` | ✅ PASS (M06 killed) |
| PROT-04 | `login.html` with a session → valid `voltar` or `index.html` | `tests/login-api.spec.js:136,144` | ✅ PASS |
| PROT-05 | With a session, library stays open, no dialog | `tests/cabecalho.spec.js:122-125` - heading visible, `locator('dialog')` `toHaveCount(0)`, URL; `:139` | ✅ PASS |
| PROT-06 | "Fazer login" → `login.html?voltar=biblioteca.html` | `tests/cabecalho.spec.js:99` - `toHaveURL(/\/frontend\/login\.html\?voltar=biblioteca\.html$/)`; path `:131-137` | ✅ PASS |
| PROT-07 | "Voltar" or Esc → `index.html` | `tests/cabecalho.spec.js:106` (Voltar), `:112-114` (Esc) | ✅ PASS (P01 killed via Esc test) |

### Mock data, regressions, edge cases

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| DB-01 | Seed = presets + seed user; `db.json` created when missing | `tests/api-mock.spec.js:74-75,82,90,118` | ✅ PASS |
| DB-02 | `npm run api:reset` overwrites `db.json` | `tests/api-mock.spec.js:98,104` | ✅ PASS |
| DB-03 | `mock/db.json` not versioned | `tests/api-mock.spec.js:110-111` | ✅ PASS |
| REG-01 | etapa04 VAL/EDGE unchanged | `tests/login-validacao.spec.js:58,72,89,99,108,146,159,174,189,199,212,219,230,239`; all pass | ✅ PASS |
| REG-02 | Slice 1 criteria satisfied | slice-1 specs untouched in range; `tests/responsive.spec.js:229-246`; all pass | ✅ PASS |
| EDGE-01 | Capitals/spaces in login e-mail find the account | `tests/auth.spec.js:40`; `tests/login-api.spec.js:53-54` | ✅ PASS |
| EDGE-02 | Button re-enabled with original text, unless redirecting | `tests/login-api.spec.js:116-117,238-239` | ✅ PASS (note: "unless redirecting" half not asserted; non-blocking, carried over) |
| EDGE-03 | Invalid JSON / missing `nome` → no session, key removed | `tests/sessao.spec.js:44-45` | ✅ PASS |

**Status**: ❌ 1 gap (PROT-01, P07e); 31/32 IDs matched the spec outcome. Spec-precision note: EDGE-02 (carried over, non-blocking).

---

## Discrimination Sensor

Scratch: `git worktree add --detach <scratchpad>/wt3 HEAD` (`2f7b90c`), `node_modules` symlinked; ports 8080/3000 free. Scratch baseline: 180 passed. Each mutant: exact-once text replacement (script aborts on 0 or >1 matches), `node mock/preparar.js --reset`, full suite with `CI=1`, `git checkout -- frontend`.

| # | File:line | Description | Result | Killing tests |
| - | --------- | ----------- | ------ | ------------- |
| P07 | `frontend/paginas/biblioteca.js:10` | `setTimeout(() => location.replace('login.html?voltar=biblioteca.html'), 1500)` after `pedirLogin` | ✅ Killed | `cabecalho.spec.js:73` |
| P07b | `frontend/paginas/biblioteca.js:10` | Same, 5000 ms | ✅ Killed | `cabecalho.spec.js:73` |
| P07c | `frontend/paginas/biblioteca.js:10` | Same with `location.assign`, 1500 ms | ✅ Killed | `cabecalho.spec.js:73` |
| P07d | `frontend/paginas/biblioteca.js:10` | `setInterval(() => location.assign('index.html'), 3000)` | ✅ Killed | `cabecalho.spec.js:73` |
| P07e | `frontend/paginas/biblioteca.js:10` | Inject `<meta http-equiv="refresh" content="2;url=login.html?voltar=biblioteca.html">` into `<head>` | ❌ Survived | - |
| P07f | `frontend/paginas/biblioteca.js:10` | `fetch('http://127.0.0.1:3000/presets').then(() => location.replace('login.html?voltar=biblioteca.html'))` | ✅ Killed | `cabecalho.spec.js:73,96,103,110,129`, `modulos.spec.js:40` |
| P06 | `frontend/paginas/biblioteca.js:10` | Immediate `location.replace(...)` after the pop-up | ✅ Killed | `cabecalho.spec.js:73,96,103,110,129` |
| P01 | `frontend/ui/aviso-login.js:45` | `show()` instead of `showModal()` | ✅ Killed | `cabecalho.spec.js:73,110` |
| M02 (regression) | `frontend/servicos/auth.js:31` | Case-insensitive password compare | ✅ Killed | `auth.spec.js:49` |
| M13 (regression) | `frontend/paginas/login.js:140` | `location.assign` after a successful submit | ✅ Killed | `login-api.spec.js:246,260` |
| M01 (regression) | `frontend/servicos/sessao.js:10-11` | Store the whole user (incl. `senha`) | ✅ Killed | `sessao.spec.js:28,34`, `login-api.spec.js:35,169` |
| M06 (regression) | `frontend/servicos/sessao.js:34` | Accept any non-empty `voltar` | ✅ Killed | `sessao.spec.js:66` (×N), `login-api.spec.js:65` |
| M09 (regression) | `frontend/ui/cabecalho.js:16` | `innerHTML` for the header name | ✅ Killed | `cabecalho.spec.js:55` |

**P07e is not equivalent.** Probe in the scratch tree (mutant applied, `page.clock.install()`, `framenavigated` logged): after `clock.runFor(60_000)` the navigation list was `[biblioteca.html]`; after a further 3.5 s of real time it was `[biblioteca.html, login.html?voltar=biblioteca.html]` and `page.url()` was the login page. The page changed its location by itself, which PROT-01 forbids. The suite misses it because meta refresh is scheduled by the browser on the wall clock, which `page.clock` does not drive, and the PROT-01 test ends ~1 s after load; the other pop-up tests click before 2 s.

**Sensor depth**: P0 (auth): 13 manual mutants (6 on the PROT-01 "by itself" clause, 2 pop-up, 5 regressions).
**Result**: 12 killed / 1 survived (P07e): ❌ FAIL

**Isolation**: real-tree `git status --porcelain` before: ` M .specs/LESSONS.md`, ` M .specs/lessons.json`, `?? .specs/features/etapa05-auth/validation.md`. After `git worktree remove --force`: identical (before this report and the L-010 lesson were written). `git worktree list` shows only the main tree; ports 8080/3000 free afterwards.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`2f7b90c` changes one test, +10 lines) |
| Surgical changes | ✅ (only `tests/cabecalho.spec.js` and `tasks.md`) |
| No scope creep | ✅ |
| Matches patterns | ✅ (comments in English, anchored URL regex kept) |
| Spec-anchored outcome check | ⚠️ PROT-01 "by itself" holds for JS timers, not for declarative refresh |
| Per-layer coverage | ✅ except PROT-01 above |
| Every test maps to a requirement | ✅ |
| Documented guidelines followed | none in repo beyond tasks.md; strong defaults applied |

---

## Gate Check

- **Gate command**: `npx playwright test` (run with `CI=1`, ports 8080/3000 free, `workers: 2`)
- **Result**: 180 passed, 0 failed, 0 skipped (42.4 s), exit 0
- **Test count before feature**: 112
- **Test count after feature**: 180 (unchanged from iteration 2; the fix strengthened an existing test)
- **Delta**: +68
- **Skipped / failures**: none

---

## Fix Plans

### Fix 1: PROT-01 does not catch a declarative refresh (P07e)

- **Root cause**: `tests/cabecalho.spec.js:89-92` advances `page.clock`, which only drives JS timers. A `<meta http-equiv="refresh">` uses the real clock and fires after the test has finished.
- **Fix task**: in the PROT-01 test, add `await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);` after `runFor` (covers any refresh delay), optionally plus a short real-time wait (`page.waitForTimeout(2500)`) before re-checking the navigation list.
- **Done when**: P07e (line injected after `pedirLogin(...)` in `frontend/paginas/biblioteca.js`) fails the suite; P07..P07d still fail it.
- **Priority**: Minor. Behaviour at HEAD is correct; this guards a regression path that no current code takes.

**Escalation**: this was iteration 3 of 3. Per the protocol the gap goes to the user: either apply Fix 1 (one assertion, test-only) and re-verify, or accept the residual risk and close the feature.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CAD-01..06, AUTH-01..06, SES-01..05 | Implementing | ✅ Verified |
| PROT-01 | Implementing | ❌ Needs Fix (Fix 1, test only) |
| PROT-02..07 | Implementing | ✅ Verified |
| DB-01..03, REG-01..02, EDGE-01..03 | Implementing | ✅ Verified |

(spec.md statuses not edited by the Verifier.)

---

## Summary

**Overall**: ❌ Not Ready (1 Minor test-strength gap; behaviour correct; escalate to user)

**Spec-anchored check**: 31/32 matched; 1 gap (PROT-01, P07e); 1 non-blocking precision note (EDGE-02)
**Sensor**: 12/13 killed (P07e survived)
**Gate**: 180 passed

**What works**: the iteration 2 fix holds: P07 and its timer variants (5 s, `assign`, `setInterval`) die; immediate and fetch-triggered redirects die; M02, M13, M01, M06, M09 still die.

**Issues found**: Fix 1 (assert no meta refresh in the PROT-01 test).

**Next steps**: escalate to the user (3-iteration limit reached).

---

## Resolution after iteration 3 (user decision, not a Verifier verdict)

The verdict above stays **FAIL**: it is the Verifier's, and the author does not rewrite it. After iteration 3 (the last of the bounded loop) the user chose "fix and close" without a fourth Verifier run.

- Fix (test only, `tests/cabecalho.spec.js`, PROT-01 test): after `clock.runFor(60_000)`, a single non-retrying read asserts there is no `meta[http-equiv="refresh" i]`.
- A first version used `await expect(...).toHaveCount(0)` and **did not** kill P07e: the assertion retries for up to 5 s, the real-time refresh fired meanwhile, moved the page to `login.html` (which has no such meta) and the retry then passed. Replaced by `expect(await locator.count()).toBe(0)`.
- Author check, re-applying each mutant in the real file and restoring it with `git checkout`: clean code passes; P07e (meta refresh, 2 s) fails; P07 (`setTimeout` replace, 1500 ms) still fails. Full suite: 180 passed.
- Independent confirmation of this last fix is pending: a fourth Verifier run was skipped by user decision. `validate_state.py` therefore still exits 1 for this feature.
