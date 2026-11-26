# Legacy Front End on the Spring Auth API - Validation

**Date**: 2026-11-18
**Spec**: `.specs/features/etapa06-front-spring-auth/spec.md`
**Diff range**: `6bdd48f..HEAD` (HEAD = ef6685c; iteration 2 re-verified `c466b5b..ef6685c`)
**Verifier**: independent sub-agent (author != verifier)
**Verdict**: PASS (iteration 2, after test-only fixes ef6685c; iteration 1 was FAIL)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T11 | Done | Commits c6923b7..c466b5b; tasks.md shows all done |

---

## Gate Check

- **Playwright (iteration 2)**: `npx playwright test` -> 354 passed, 0 failed, 0 skipped (348 + 6 new tests; the 356 mentioned in the request was a miscount). Iteration 1: 348 passed, 0 failed, 0 skipped (1.7 min; Playwright started 8080, 3000 and Spring 8081 itself)
- **Backend** (both iterations): `cd backend && ./mvnw -q clean test` -> exit 0, 76 tests (surefire reports), 0 failures
- Test count before feature 327 (tasks.md baseline), after 348 (+21); `tests/api-usuarios.spec.js` was removed with its module (justified in spec: `/usuarios` calls are dead code), replaced by `tests/api-auth.spec.js`.

---

## Spec-Anchored Acceptance Criteria

Paths relative to `tests/` unless noted. "page" = real login page driven by Playwright.

| ID | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| WEB-01 | POST `http://127.0.0.1:8081/auth/login`, JSON `{email, senha}`, no mock call | `login-api.spec.js:41,46-47` `req.url()===\`${API_AUTH}/login\``, `method()` `'POST'`, `postDataJSON()` `{email:'ryan@exemplo.com', senha:'teste123'}`; `api-auth.spec.js:39-41` headers/body; `api-auth.spec.js:84` and `auth.spec.js:120` `expect(paraOMock).toEqual([])`; `api-cliente.spec.js` (T3 block) port 8081 vs 3000 | PASS |
| WEB-02 | resolves `{id,nome,email}`; session has exactly those 3 fields; redirect | `auth.spec.js:45-48` `toEqual({ok:true, valor:{id:7,nome:'Davi',email:'davi@x.com'}})` (server sent token and senha); `login-api.spec.js:48-49` URL `/frontend/index.html`, session `toEqual({id:1,nome:'Ryan Corsino',email})`; `login-spring.spec.js:40` `Object.keys(sessao).sort()` `['email','id','nome']` | PASS |
| WEB-03 | 401 -> `CredenciaisInvalidas`; text "E-mail ou senha incorretos."; password field cleared | `auth.spec.js:63` `erro:'CredenciaisInvalidas'`; `login-api.spec.js:84-85` `toHaveText(MSG_CREDENCIAIS)` (= exact spec text), `#senha` `toHaveValue('')`; `login-spring.spec.js:65` | PASS |
| WEB-04 | 400+`campos`: message next to each field; first invalid field focused | `login-erros-servidor.spec.js:44-47` `mensagemDe(email)` `'E-mail do servidor'`, `mensagemDe(senha)`, `#email` `toBeFocused()` (server sends senha first, so first = form order); `auth.spec.js:78` `DadosInvalidos` + `campos`; `api-cliente.spec.js` T3 `corpo` equality | PASS |
| WEB-05 | no answer / timeout / other status -> "Não foi possível conectar ao servidor. Tente novamente." and `ErroApi` | `login-api.spec.js:105` abort and `:315` (500) `toHaveText(MSG_CONEXAO)`, values kept; `login-erros-servidor.spec.js:71` (400 without campos); `auth.spec.js:86,94` `erro:'ErroApi'`; timeout `api-cliente.spec.js:91`. M30 (message altered) killed | PASS |
| WEB-06 | no password/token in session/localStorage | `login-spring.spec.js:93-94` `not.toContain('teste123')`, `not.toContain('eyJ')` over `{...sessionStorage}+{...localStorage}`; `:103-104` same after registration. Mutants M17 (password in localStorage) and M18 (token in sessionStorage) both KILLED, so the assertions do fail when stored | PASS |
| WEB-07 | POST `/auth/cadastro` JSON `{nome,email,senha}`, no mock call | `login-api.spec.js:179,184` `posts` `toEqual([{nome:'Ana Teste',email,senha:'senha1234'}])`; `api-auth.spec.js:54-56`; `api-auth.spec.js:84`, `auth.spec.js:120` | PASS |
| WEB-08 | 201 -> resolves `{id,nome,email}`; session opened; redirect | `auth.spec.js:54-57` `toEqual({id:9,nome:'Eva',email})` (server sent senha); `login-api.spec.js:183,186` URL and session `{id:expect.any(Number),nome:'Ana Teste',email}`; `login-spring.spec.js:41` | PASS |
| WEB-09 | 409 -> `EmailEmUso`; exact text next to e-mail field; field focused | `auth.spec.js:70` `erro:'EmailEmUso'`; `login-api.spec.js:209` `toHaveText(MSG_EMAIL_EM_USO)`, `:211` `expect(campo).toBeFocused()`; `login-spring.spec.js:82`. M14 now KILLED | PASS |
| WEB-10 | 400+`campos` on registration: per-field messages; first invalid focused | `login-erros-servidor.spec.js:31-34` `cadastro-nome` text, `cadastro-senha` text, `cadastro-email` `toBeNull()`, `#cadastro-nome` `toBeFocused()` | PASS |
| WEB-11 | other failures -> connection text and `ErroApi` | `login-api.spec.js:224`, `:327` (500), `:336` (400 without campos) `toHaveText(MSG_CONEXAO)`; `auth.spec.js:87` `erro:'ErroApi'` | PASS |
| WEB-12 | pending: button disabled with "Entrando..." / "Cadastrando..." | `login-api.spec.js:118-119` `toBeDisabled()`, `toHaveText('Entrando...')`; `:236-237` `toBeDisabled()`, `'Cadastrando...'`; restored `'Login'`/`'Cadastrar'` at `:123-124`,`:241-242`; `ajustes.spec.js:21-48` disabled styling for both. Mutants M15 (no disable) and M16 (texts swapped) KILLED | PASS |
| WEB-13 | preflight allowed for 127.0.0.1:8080 and :5173 on both routes, localhost kept, others refused | `SegurancaConfigTest.java:61-63,70-72` `status().isOk()`, `Access-Control-Allow-Origin` equals origin, for `/auth/cadastro` and `/auth/login`; `:31-33,38-40` localhost origins; `:45-47,52-54,78-80` evil, localhost:3000, 127.0.0.1:3000 -> 403 and no header. M26, M27, M28 (any origin) KILLED | PASS |
| WEB-14 | `npx playwright test` starts (or reuses) Spring on 8081 | `playwright.config.js:426-437` third `webServer` (`port: 8081`, `reuseExistingServer`). No dedicated test (tasks.md: "build gate only"); M29 (block removed, no Spring running) KILLED by `login-spring.spec.js:53` | PASS (by sensor) |
| WEB-15 | register through page on real server -> redirect and session with id, nome, email; second page load signs in with same credentials | `login-spring.spec.js:38,40-42,48-49` URL, `Object.keys` `['email','id','nome']`, `toEqual({id:any Number,nome:'Ana Real',email})`, second page `lerSessao(outra)` `toEqual(sessao)` | PASS |
| WEB-16 | ryan@exemplo.com / teste123 -> id 1, "Ryan Corsino", e-mail | `login-spring.spec.js:58` `toEqual({id:1,nome:'Ryan Corsino',email:'ryan@exemplo.com'})` | PASS |
| WEB-17 | spaces in password sent unchanged | page: `login-api.spec.js:297` `toEqual([{email:'RYAN@Exemplo.com', senha:'  espacos 1  '}])`; `:306` `senha:'  senha 1234  '`, `nome:'  Ana Souza '`; service `auth.spec.js:105-108`; module `api-auth.spec.js:69-72`. M10d, M10e, M10g KILLED | PASS |
| WEB-18 | e-mail casing and surrounding spaces sent as typed | page: `login-api.spec.js:59-60` exact `postDataJSON().email` `toBe('RYAN@Exemplo.com')` (trim removed), `:297`, `:306` `email:'Ana@X.COM'`; service/module as before. M10f and lower-casing login e-mail (M10c2) KILLED. Spaces around an e-mail are not observable on the page: `login.html:47,71` are `type="email"` inputs, which the browser strips, so M10c (page trims login e-mail) is EQUIVALENT | PASS (spaces covered at service/module level) |
| WEB-19 | Spring down: login/registration show connection text; packs, cart, checkout work on mock | login/registration: `login-api.spec.js:105,224`; packs `login-spring.spec.js:112-113`; cart and checkout `login-spring.spec.js:126` `toHaveCount(1)`, `:127` `toContainText('Rock · Zoom G6')`, `:130` `.checkout-resumo .item-preco` `toHaveCount(1)` with every 8081 request aborted | PASS |

**Status**: 19/19 PASS with file:line evidence. WEB-14 stays a documented spec-precision gap (no dedicated test; proved by M29, non-blocking, recorded in tasks.md).

### Judgment points

- `login-validacao.spec.js` 'accepts a short password on login' (`login-validacao.spec.js:162-174` in the new file): the intent was "login does not apply the 8-character rule, so a 3-character password still reaches the server". It now requires a `POST /auth/login` after submitting `123` and `senha` not `aria-invalid`; the request would be absent if the rule were applied, so the intent survives. It does not assert the body, which is acceptable.
- WEB-06 assertions discriminate: a stored password or a JWT (HS256 tokens start `eyJ`) fails them (M17, M18 killed).

---

## Discrimination Sensor

Scratch: temporary git worktree of HEAD (removed afterwards), real tree untouched. Depth: P0-full for auth, 29 mutants run.

| # | File | Mutation | Specs run | Killed? |
| - | ---- | -------- | --------- | ------- |
| M1 | `frontend/api/cliente.js:41` | `servidor` option ignored (always mock URL) | api-cliente, api-auth | Killed |
| M2 | `cliente.js:47` | `servidor` key passed to `fetch` | api-cliente | Killed |
| M3 | `cliente.js:26` | `ErroApi.corpo` not set | api-cliente, auth | Killed |
| M4 | `servicos/auth.js:153` | 401 on login not mapped | auth | Killed |
| M5 | `servicos/auth.js:164` | 409 on registration not mapped | auth | Killed |
| M6 | `servicos/auth.js:136` | 400 without `campos` becomes `DadosInvalidos` | auth, login-erros-servidor | Killed |
| M7 | `servicos/auth.js:136` | 400 with `campos` not mapped | auth, login-erros-servidor | Killed |
| M8 | `servicos/auth.js:149` | token added to resolved user (login) | auth | Killed |
| M8b | `servicos/auth.js:161` | raw server body (with senha) returned by `cadastrar` | auth | Killed |
| M9 | `servicos/auth.js:149` | e-mail trimmed and lower-cased before sending (service) | auth, api-auth | Killed |
| M10 | `servicos/auth.js:161` | senha trimmed (service, registration) | auth | Killed |
| M10b | `api/auth.js:93` | e-mail trimmed in API module | api-auth, auth | Killed |
| M10c | `paginas/login.js:360` | page trims login e-mail | login-api, login-spring, login-validacao |  EQUIVALENT (iteration 2: `type=email` strips spaces) |
| M10d | `paginas/login.js:360` | page trims login password | same |  Killed (iteration 2) |
| M10e | `paginas/login.js:365` | page trims registration password | same |  Killed (iteration 2) |
| M10f | `paginas/login.js:364` | page lower-cases registration e-mail | same |  Killed (iteration 2) |
| M11 | `paginas/login.js:300` | focus last matched field instead of first | login-erros-servidor | Killed |
| M12 | `paginas/login.js:293` | server message not shown for `senha` | login-erros-servidor | Killed |
| M13 | `paginas/login.js:307` | password field not cleared on 401 | login-api | Killed |
| M14 | `paginas/login.js:314` | `EmailEmUso` no longer focuses the e-mail field | login-api, login-spring, login-erros-servidor, ajustes |  Killed (iteration 2) |
| M15 | `paginas/login.js:328` | submit button not disabled while pending | login-api, login-spring, login-erros-servidor, ajustes | Killed |
| M16 | `paginas/login.js:237` | pending texts swapped | same | Killed |
| M17 | `paginas/login.js:331` | password written to `localStorage` | login-spring | Killed |
| M18 | `servicos/auth.js:149` | token written to `sessionStorage` | login-spring | Killed |
| M19 | `api/auth.js:84` | `servidor:'spring'` removed (login goes to mock) | api-auth, login-api | Killed |
| M20 | `api/auth.js:93` | login posts to `/auth/cadastro` | api-auth | Killed |
| M21 | `api/auth.js:85` | GET instead of POST | api-auth | Killed |
| M22 | `api/auth.js:98` | registration posts to `/auth/login` | api-auth | Killed |
| M23 | `paginas/login.js:236` | connection message text altered | login-api etc. | Killed |
| M24 | `paginas/login.js:286` | registration `senha` mapped to e-mail field | login-erros-servidor | Killed |
| M25 | `paginas/login.js:331` | `abrirSessao` removed | login-api, login-spring | Killed |
| M26 | `SegurancaConfig.java:18` | CORS `127.0.0.1:5173` removed | SegurancaConfigTest | Killed |
| M27 | `SegurancaConfig.java:17` | CORS `127.0.0.1:8080` removed | SegurancaConfigTest | Killed |
| M28 | `SegurancaConfig.java:35` | CORS allows any origin | SegurancaConfigTest | Killed |
| M29 | `playwright.config.js:426-437` | Spring webServer removed, Spring not running | login-spring | Killed |

**Sensor depth**: P0-full (29 mutants)
**Result iteration 1**: 25/29 killed, 5 survived (M10c-f, M14) -> FAIL.
**Iteration 2** (HEAD ef6685c, same worktree method): M10d, M10e, M10f, M14 KILLED; extra M10c2 (page lower-cases login e-mail), M10g (page trims registration name), M30 (connection message altered) KILLED; M10c EQUIVALENT (browser strips spaces of `type=email`); M29 (Spring webServer removed) still KILLED.
**Result**: 0 surviving mutants that matter -> PASS

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / no scope creep | OK (`DadosInvalidos`, `interpretar400` are required by WEB-04/10) |
| Surgical changes | OK; mock `/usuarios` untouched, `api/usuarios.js` removed per spec |
| Matches patterns | OK (comments in English, tests in Portuguese with ID comments) |
| Spec-anchored outcome check | Gaps: WEB-09 focus, WEB-17/18 at page level |
| Every test maps to a spec requirement | OK |
| Documented guidelines | none - strong defaults applied |

---

## Edge Cases

- [x] WEB-17 at service/module level; [ ] at page level (Gap 1)
- [x] WEB-18 at service/module level; [ ] at page level, and `login-api.spec.js:59` trims the actual value (Gap 1)
- [x] WEB-19 login/registration messages and packs page; cart/checkout not exercised (Gap 6)

---

## Ranked Gaps

None blocking. Iteration 1 gaps 1, 2, 4, 5 are closed by ef6685c. Gap 3 (WEB-14 has no dedicated test) is accepted as a documented spec-precision gap, proved by M29.

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| WEB-01..13, 15..19 | Pending | Verified |
| WEB-14 | Pending | Verified (spec-precision gap, proved by sensor M29) |

## Summary

**Overall**: Ready (PASS, iteration 2 of 3)
**Spec-anchored check**: 19/19 ACs matched with file:line evidence; 1 documented spec-precision gap (WEB-14)
**Sensor**: all non-equivalent mutants killed (iteration 2: 8/8 killed, 1 equivalent)
**Gate**: 354 Playwright + 76 JUnit passed
