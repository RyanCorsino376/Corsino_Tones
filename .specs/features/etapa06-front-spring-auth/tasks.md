# Legacy Front End on the Spring Auth API - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa06-front-spring-auth/spec.md`
**Design**: `.specs/features/etapa06-front-spring-auth/design.md`
**Status**: Draft

Code comments and commit messages are in English. Playwright test names follow the existing Portuguese style, with requirement IDs in comments.

Phase 2 is a switch-over: once `servicos/auth.js` calls Spring (T5), page tests that still intercept the mock fail until T7 to T9 rewrite them. Tasks T4 to T9 therefore use the quick gate of their own spec files; T10, the last task of the phase, runs the full suite.

---

## Test Coverage Matrix

> Generated from the spec and the repo - confirm before Execute. Guidelines found: none; strong defaults applied. Style follows `tests/*.spec.js` (Playwright, host-page imports, `page.route`) and `backend/src/test` (JUnit).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `api/` modules (`cliente.js`, `auth.js`) | e2e (module in page) | Request shape, every status class, timeout path | `tests/api-*.spec.js` | `npx playwright test` |
| `servicos/auth.js` | e2e (module in page) | 1:1 to WEB ACs; every status mapping; normalisation edge cases | `tests/auth.spec.js` | `npx playwright test` |
| Pages (`paginas/login.js`) | e2e | Happy + each error + pending state, against interception and the real server | `tests/login-*.spec.js` | `npx playwright test` |
| Backend CORS config | integration (MockMvc) | Allowed and refused origins | `backend/src/test/java/.../config/*Test.java` | `cd backend && ./mvnw -q test` |
| Config (`playwright.config.js`) | none | Proved by the first run of a Spring-dependent spec | - | build gate only |

## Gate Check Commands

> Generated from the repo - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `npx playwright test tests/<files of the task>` (backend task: `cd backend && ./mvnw -q clean test -Dtest=<Class>`) |
| Full | Before every commit outside the switch-over | `npx playwright test` and `cd backend && ./mvnw -q clean test` |
| Build | Last task of a phase | the Full gate |

Baseline before T1: run `npx playwright test` and record the count in the T1 commit body (327 expected, none yet depends on Spring).

---

## Execution Plan

### Phase 1: Server and runner

```
T1 -> T2 -> T3
```

### Phase 2: Switch-over

```
T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10
```

### Phase 3: Real server

```
T11
```

---

## Task Breakdown

### T1: Allow the 127.0.0.1 origins in Spring CORS

**What**: Add `http://127.0.0.1:8080` and `http://127.0.0.1:5173` to the allowed origins.
**Where**: `backend/src/main/java/com/corsinotones/config/SegurancaConfig.java`
**Depends on**: None
**Reuses**: `backend/src/test/java/com/corsinotones/config/SegurancaConfigTest.java`
**Requirement**: WEB-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Preflight `OPTIONS /auth/login` and `/auth/cadastro` from `http://127.0.0.1:8080` and from `http://127.0.0.1:5173` answers 200 with `Access-Control-Allow-Origin` equal to that origin
- [x] The two `localhost` origins still pass; `http://evil.example` and `http://127.0.0.1:3000` are refused (403, no allow-origin header)
- [x] Gate passes: `cd backend && ./mvnw -q clean test`
- [x] Test count: 73 plus 3 new tests (5 preflight scenarios) pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): allow the 127.0.0.1 front-end origins`

---

### T2: Start Spring from the Playwright config

**What**: Add a third `webServer` that runs Spring with a test-only `CORSINO_JWT_SECRET`, waits for port 8081 and is reused when already running.
**Where**: `playwright.config.js`
**Depends on**: T1
**Reuses**: the two existing `webServer` entries
**Requirement**: WEB-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] With nothing on 8081, `npx playwright test tests/sessao.spec.js` starts Spring (log shows the Spring banner or port 8081 listening) and passes
- [x] With Spring already running on 8081, the same command reuses it (no second start)
- [x] The secret in the config is a test-only literal of 32+ characters and no real secret is committed
- [x] Gate passes: `npx playwright test`
- [x] Test count: all baseline tests pass (no silent deletions)

**Tests**: none
**Gate**: full

**Commit**: `test(frontend): start the Spring server for the Playwright suite`

---

### T3: Let requisicao pick a server and keep the error body

**What**: Add `SPRING_URL`, the `servidor` option and `ErroApi.corpo` (parsed JSON of a non-2xx answer, else `null`).
**Where**: `frontend/api/cliente.js`
**Depends on**: T2
**Reuses**: `requisicao`, `classificar`, `tests/api-cliente.spec.js`
**Requirement**: WEB-01, WEB-04, WEB-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `requisicao('/x', {servidor: 'spring'})` fetches `http://127.0.0.1:8081/x`; without the option it still fetches `http://127.0.0.1:3000/x`
- [x] The `servidor` key is not passed to `fetch`
- [x] A `400` answer with body `{"campos":{"email":"m"}}` rejects with an `ErroApi` whose `status` is 400 and whose `corpo` equals that object; a `500` with a non-JSON body gives `corpo` `null`
- [x] The 8000 ms limit and the `console.error` log still apply to Spring calls
- [x] Gate passes: `npx playwright test tests/api-cliente.spec.js`
- [x] Test count: existing 6 tests plus 6 new tests (11 -> 12 in the file) pass

**Tests**: e2e
**Gate**: quick

**Commit**: `feat(frontend): let the API client choose the Spring server`

---

### T4: Add the Spring auth API module

**What**: `entrarNoServidor` and `cadastrarNoServidor`, JSON `POST` to `/auth/login` and `/auth/cadastro` on the Spring server.
**Where**: `frontend/api/auth.js`
**Depends on**: None (previous phase complete)
**Reuses**: `frontend/api/usuarios.js` (shape), `tests/api-usuarios.spec.js` (style)
**Requirement**: WEB-01, WEB-07, WEB-17, WEB-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `entrarNoServidor` sends `POST http://127.0.0.1:8081/auth/login` with `Content-Type: application/json` and a body with exactly `email` and `senha`, and resolves with the answer
- [x] `cadastrarNoServidor` sends `POST /auth/cadastro` with exactly `nome`, `email`, `senha`
- [x] A password `"  espacos  "` and an e-mail `" Ana@X.com "` reach the body unchanged
- [x] Neither function calls the mock (no request to port 3000)
- [x] A `401`, `409`, `400` and a network abort each reject with an `ErroApi` carrying that status (0 for the abort)
- [x] Gate passes: `npx playwright test tests/api-auth.spec.js`
- [x] Test count: 8 new tests pass

**Tests**: e2e
**Gate**: quick

**Commit**: `feat(frontend): add the Spring auth API module`

---

### T5: Switch the auth service to Spring

**What**: `entrar` and `cadastrar` use the new module, map 401/409/400 to `CredenciaisInvalidas`, `EmailEmUso` and the new `DadosInvalidos`, and resolve `{id, nome, email}`; remove the "mock-only weakness" comment.
**Where**: `frontend/servicos/auth.js`
**Depends on**: T4
**Reuses**: `CredenciaisInvalidas`, `EmailEmUso`, `tests/auth.spec.js`
**Requirement**: WEB-02, WEB-03, WEB-05, WEB-08, WEB-09, WEB-11, WEB-17, WEB-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A `200` answer with user `{id: 7, nome: 'Davi', email: 'davi@x.com'}` makes `entrar` resolve exactly `{id: 7, nome: 'Davi', email: 'davi@x.com'}` (no token, no password)
- [x] `401` -> `CredenciaisInvalidas`; `409` on `cadastrar` -> `EmailEmUso`; `400` with `campos` -> `DadosInvalidos` carrying those `campos`
- [x] Network abort, timeout, `500`, `404` and a `400` without `campos` -> `ErroApi`
- [x] `cadastrar` sends name and e-mail as typed (no trim, no lower-case) and the password unchanged; `entrar` does the same
- [x] A `201` answer makes `cadastrar` resolve `{id, nome, email}` of the answer
- [x] No call to `/usuarios` on the mock
- [x] Gate passes: `npx playwright test tests/auth.spec.js`
- [x] Test count: 10 tests pass in the rewritten file

**Tests**: e2e
**Gate**: quick

**Commit**: `feat(frontend): sign in and register through the Spring API`

---

### T6: Show server field errors on the login page

**What**: `tratarFalha` maps `DadosInvalidos.campos` onto the form fields, shows each message with `mostrarErro` and focuses the first invalid field.
**Where**: `frontend/paginas/login.js`
**Depends on**: T5
**Reuses**: `mostrarErro`, `tests/login-api.spec.js` helpers
**Requirement**: WEB-04, WEB-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Registration with a mocked `400` `{campos: {nome: 'A', senha: 'B'}}` shows "A" on `#cadastro-nome`, "B" on `#cadastro-senha`, nothing on the e-mail field, and focuses `#cadastro-nome`
- [x] Login with a mocked `400` `{campos: {email: 'C', senha: 'D'}}` shows "C" on `#email` and "D" on `#senha` and focuses `#email`
- [x] The messages are linked through `aria-describedby` like the local ones
- [x] A `400` without `campos` shows the connection alert
- [x] Gate passes: `npx playwright test tests/login-erros-servidor.spec.js`
- [x] Test count: 4 new tests pass in the new file

**Tests**: e2e
**Gate**: quick

**Commit**: `feat(frontend): show server validation messages on the login page`

---

### T7: Move the login and registration page tests to Spring

**What**: Rewrite `tests/login-api.spec.js` so its interceptors and request assertions target `http://127.0.0.1:8081/auth/*` instead of the mock's `/usuarios`, keeping every behaviour it covers.
**Where**: `tests/login-api.spec.js`
**Depends on**: T6
**Reuses**: the file's own helpers (`enviarLogin`, `segurarUsuarios`)
**Requirement**: WEB-01, WEB-02, WEB-03, WEB-05, WEB-07, WEB-08, WEB-09, WEB-11, WEB-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] The successful login asserts a `POST` to `http://127.0.0.1:8081/auth/login` whose JSON body has `email` and `senha`, and the session equals `{id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com'}`
- [x] The `?voltar=` redirects, history, pending-button, single-alert and already-signed-in tests keep their assertions
- [x] Duplicate registration is driven by a `409` answer and shows "Este e-mail já está cadastrado." on the e-mail field
- [x] Communication failures abort `**/auth/**` on 8081 and show "Não foi possível conectar ao servidor. Tente novamente."
- [x] The file's test count is unchanged (`grep -c "test("` before and after) except tests that only existed for the mock's two-step e-mail check, each removed one named in the commit body with the reason
- [x] Gate passes: `npx playwright test tests/login-api.spec.js`
- [x] Test count: 19 tests pass in the file (20 before; the removed one is the mock-only "duplicate check failing" test)

**Tests**: e2e
**Gate**: quick

**Commit**: `test(frontend): run the login page tests against the Spring routes`

---

### T8: Move the validation page tests to Spring

**What**: Point the interceptor of `tests/login-validacao.spec.js` at `http://127.0.0.1:8081/auth/**` and its request assertions at `POST /auth/cadastro` and `POST /auth/login`.
**Where**: `tests/login-validacao.spec.js`
**Depends on**: T7
**Reuses**: `interceptarUsuarios`
**Requirement**: WEB-07, WEB-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A valid submit asserts exactly one `POST` to `/auth/cadastro` (or `/auth/login`) on 8081 and none to the mock
- [x] An invalid submit still sends no request to either server
- [x] All validation-message tests keep their assertions
- [x] Gate passes: `npx playwright test tests/login-validacao.spec.js`
- [x] Test count: unchanged from the baseline of this file

**Tests**: e2e
**Gate**: quick

**Commit**: `test(frontend): run the validation tests against the Spring routes`

---

### T9: Point the disabled-button tests at Spring

**What**: Change the two `page.route` calls that never answer from the mock's `/usuarios` to `http://127.0.0.1:8081/auth/**`.
**Where**: `tests/ajustes.spec.js`
**Depends on**: T8
**Requirement**: WEB-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Both tests hold the request on 8081, the button stays disabled and shows the pending text
- [x] Gate passes: `npx playwright test tests/ajustes.spec.js`
- [x] Test count: unchanged from the baseline of this file

**Tests**: e2e
**Gate**: quick

**Commit**: `test(frontend): hold the Spring auth request in the disabled-button tests`

---

### T10: Remove the mock users API module

**What**: Delete `frontend/api/usuarios.js` and `tests/api-usuarios.spec.js`; nothing in `frontend/` references `/usuarios`.
**Where**: `frontend/api/usuarios.js`
**Depends on**: T9
**Requirement**: WEB-01, WEB-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `grep -rn "usuarios" frontend --include=*.js --include=*.html` finds no import of the module and no request path `/usuarios`
- [x] `tests/modulos.spec.js` still passes (it checks the module layering)
- [x] Gate passes: `npx playwright test` (full suite) and `cd backend && ./mvnw -q clean test`
- [x] Test count: 341 Playwright tests pass (327 - 5 removed with `api-usuarios.spec.js` - 1 removed in T7 + 6 in T3 + 8 in T4 + 2 net in T5 + 4 in T6); 76 backend tests pass

**Tests**: none
**Gate**: build

**Commit**: `refactor(frontend): remove the mock users API module`

---

### T11: Test sign-in and registration against the real server

**What**: `tests/login-spring.spec.js` drives `login.html` with no interception against the running Spring server.
**Where**: `tests/login-spring.spec.js`
**Depends on**: None (previous phase complete)
**Reuses**: `emailUnico`, the page helpers of `tests/login-api.spec.js`
**Requirement**: WEB-06, WEB-15, WEB-16, WEB-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Registering a unique e-mail through the page reaches `index.html` and `sessionStorage['corsino:sessao']` holds that user's `id` (a number other than 1), `nome` and `email` and no other key
- [x] Opening a fresh page and signing in with the same e-mail (other letter case) and password reaches `index.html` with the same `id`
- [x] `ryan@exemplo.com` / `teste123` gives id 1 and "Ryan Corsino"
- [x] A wrong password shows "E-mail ou senha incorretos." and no session; registering the same e-mail twice shows the duplicate message on the e-mail field
- [x] After a successful login neither `sessionStorage` nor `localStorage` contains the password or a string starting with `eyJ` (token)
- [x] With every request to 8081 aborted, `packs.html` still lists the packs from the mock
- [x] Gate passes: `npx playwright test` (full suite)
- [x] Test count: 7 new tests pass

**Tests**: e2e
**Gate**: full

**Commit**: `test(frontend): cover sign-in and registration against the real Spring server`

---

## Phase Execution Map

```
Phase 1 -> Phase 2 -> Phase 3

Phase 1:  T1 ------> T2 ------> T3
Phase 2:  T4 ------> T5 ------> T6 ------> T7 ------> T8 ------> T9 ------> T10
Phase 3:  T11
```

Execution is strictly sequential. 11 tasks fit one batch of about 8 plus 3; execution stays inline.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | none | ✅ Match |
| T2 | T1 | T1 | ✅ Match |
| T3 | T2 | T2 | ✅ Match |
| T4 | None (previous phase complete) | previous phase | ✅ Match |
| T5 | T4 | T4 | ✅ Match |
| T6 | T5 | T5 | ✅ Match |
| T7 | T6 | T6 | ✅ Match |
| T8 | T7 | T7 | ✅ Match |
| T9 | T8 | T8 | ✅ Match |
| T10 | T9 | T9 | ✅ Match |
| T11 | None (previous phase complete) | previous phase | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Backend CORS config | integration | integration | ✅ OK |
| T2 | Playwright config | none | none | ✅ OK |
| T3 | `api/` module | e2e | e2e | ✅ OK |
| T4 | `api/` module | e2e | e2e | ✅ OK |
| T5 | Service | e2e | e2e | ✅ OK |
| T6 | Page | e2e | e2e | ✅ OK |
| T7 | Tests only (page behaviour) | e2e | e2e | ✅ OK |
| T8 | Tests only | e2e | e2e | ✅ OK |
| T9 | Tests only | e2e | e2e | ✅ OK |
| T10 | Deletion of a dead module | none | none | ✅ OK |
| T11 | Tests only (real server) | e2e | e2e | ✅ OK |

---

## Requirement Coverage

WEB-01: T3, T4, T7, T10 · WEB-02: T5, T7 · WEB-03: T5, T7 · WEB-04: T3, T6 · WEB-05: T3, T5, T7 · WEB-06: T11 · WEB-07: T4, T7, T8, T10 · WEB-08: T5, T7 · WEB-09: T5, T7 · WEB-10: T6 · WEB-11: T5, T7 · WEB-12: T7, T8, T9 · WEB-13: T1 · WEB-14: T2 · WEB-15: T11 · WEB-16: T11 · WEB-17: T4, T5 · WEB-18: T4, T5 · WEB-19: T11.
