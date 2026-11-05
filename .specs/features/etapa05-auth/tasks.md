# Login, Registration and Session - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa05-auth/spec.md`
**Design**: `.specs/features/etapa05-auth/design.md`
**Status**: Draft

### Files removed or untracked by this feature

- T1 untracks `mock/db.json` (`git rm --cached`; the file stays on disk, regenerated from `mock/db.seed.json`).
- T5 deletes `frontend/login.js`; its code moves to `frontend/paginas/login.js`.

Approving these tasks approves both.

### Existing tests rewritten (VAL-06 superseded)

T5 and T6 rewrite these tests of `tests/login-validacao.spec.js` to the new outcome. Each still checks the same validation rule; only the "valid form" result changes from "placeholder message" to "request sent", and "invalid form" from "no message" to "no request":

| Line | Test | New assertion |
| ---- | ---- | ------------- |
| 54-61 | accepts "Ry", "ryan@x.com" and an 8-character password | `POST /usuarios` is sent (intercepted) |
| 94-104 | a valid submit keeps the page and shows a success message | the valid registration reaches the server and the page does not reload before the response |
| 107-112 | an invalid submit shows no success message | no request to `/usuarios` |
| 122-131 | login rejects a bad e-mail and an empty password | messages as today + no request to `/usuarios` |
| 135-140 | accepts a short password on login | `GET /usuarios?email=` is sent (intercepted) |

### Stage 05 requirement mapping

| Stage 05 item | Covered by |
| ------------- | ---------- |
| Operation submitted to the server | T2, T6 (`POST /usuarios`) |
| Query operation | T2, T5 (`GET /usuarios?email=`), slice 1 |
| Success handling | T5, T6 (session + redirect) |
| Error handling | T5, T6 (wrong credentials, duplicate e-mail, communication failure) |
| Loading handling | T5, T6 ("Entrando..." / "Cadastrando...") |
| Modules | T2-T4 (`api/`, `servicos/`), T5, T7 (`paginas/`, `ui/`) |

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: none; strong defaults applied. Style follows `tests/*.spec.js` (Playwright, Portuguese test names, requirement IDs in comments).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Mock data scripts (`mock/*`, `package.json`, `.gitignore`) | e2e (Node `child_process` + `fs`) | DB-01..03 each asserted | `tests/api-mock.spec.js` | `npx playwright test` |
| API layer (`frontend/api/usuarios.js`) | e2e (module imported in the browser) | Query string, POST body/headers, null on miss, error on non-list | `tests/api-usuarios.spec.js` | `npx playwright test` |
| Services (`frontend/servicos/*.js`) | e2e (module imported in the browser) | All branches; 1:1 to SES-01, PROT-03, EDGE-01, EDGE-03 and the auth rules | `tests/sessao.spec.js`, `tests/auth.spec.js` | `npx playwright test` |
| Page modules and header (`frontend/paginas/*.js`, `frontend/ui/cabecalho.js`) | e2e | 1:1 to AUTH, CAD, SES-02..05, PROT criteria; happy + error + edge paths | `tests/login-api.spec.js`, `tests/cabecalho.spec.js`, `tests/login-validacao.spec.js` | `npx playwright test` |
| Markup and styles | e2e | Through the behaviour above; `responsive.spec.js` guards layout | `tests/*.spec.js` | `npx playwright test` |

## Gate Check Commands

> From `package.json` (`"test": "playwright test"`). No linter or formatter configured.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `npx playwright test tests/<file of the task>` |
| Full | Before every commit | `npx playwright test` |
| Build | After the last task | `npx playwright test` |

Baseline before T1: **112 passing** (slice 1 handoff; re-measured at the start of T1).

---

## Execution Plan

### Phase 1: Data and services

Seed data first, then the three modules the pages will use. Each is tested on its own by importing it in a page.

```
T1 -> T2 -> T3 -> T4
```

### Phase 2: Pages

Login first (it moves the script), then registration on the same page, then the header everywhere, then the guard that relies on all of them.

```
T5 -> T6 -> T7 -> T8
```

---

## Task Breakdown

### T1: Seed data file and reset command

**What**: Split the mock data into a tracked seed and a git-ignored working copy, add the seed user, and add `npm run api:reset`.
**Where**: `mock/preparar.js` (new); also `mock/db.seed.json` (new), `package.json`, `playwright.config.js`, `.gitignore`, `mock/db.json` (untracked)
**Depends on**: None
**Reuses**: Current `mock/db.json` content; webServer entry in `playwright.config.js`
**Requirement**: DB-01, DB-02, DB-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `mock/db.seed.json` holds the 9 presets and `usuarios: [{ id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com', senha: 'teste123' }]` -> `tests/api-mock.spec.js`
- [x] In a temporary copy of `mock/`, `node preparar.js` creates a missing `db.json` equal to the seed and leaves an existing one untouched; `node preparar.js --reset` overwrites it with the seed
- [x] `git check-ignore mock/db.json` succeeds and `git ls-files mock/db.json` is empty
- [x] `GET /usuarios?email=ryan@exemplo.com` on the running mock returns the seed user
- [x] `npm run api` and the Playwright web server both run `preparar.js` before json-server
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 112 + new tests pass

**Tests**: e2e (`tests/api-mock.spec.js`)
**Gate**: full
**Commit**: `build(api): serve the mock from a git-ignored copy of a seed file`

**Status**: Complete

Test count: 119 (112 + 7). The old `.gitignore` had no final newline, so the new entry was first glued to `playwright-report/`; the file was rewritten with one entry per line.

---

### T2: Users API module

**What**: Create `buscarUsuarioPorEmail` and `criarUsuario` over `GET` / `POST /usuarios`.
**Where**: `frontend/api/usuarios.js` (new)
**Depends on**: T1
**Reuses**: `requisicao`, `ErroApi`, `registrarErro` from `frontend/api/cliente.js`
**Requirement**: AUTH-02 (request half), CAD-02 (request half)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `buscarUsuarioPorEmail('ryan@exemplo.com')` resolves with the seed user; an unknown e-mail resolves with `null` -> `tests/api-usuarios.spec.js`
- [x] The request URL encodes the e-mail (`a+b@x.com` arrives as `email=a%2Bb%40x.com`)
- [x] A non-list body rejects with `ErroApi`
- [x] `criarUsuario({...})` sends `POST /usuarios` with `Content-Type: application/json` and exactly the given `nome`, `email`, `senha`; resolves with the record including a numeric `id`; the record is then returned by `GET /usuarios?email=` (unique e-mail per run)
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: T1 total + new tests pass

**Tests**: e2e (`tests/api-usuarios.spec.js`)
**Gate**: full
**Commit**: `feat(api): add users lookup and creation endpoints`

**Status**: Complete

Test count: 124 (119 + 5).

---

### T3: Session service

**What**: Create `abrirSessao`, `usuarioAtual`, `encerrarSessao`, `destinoSeguro` and `exigirLogin`.
**Where**: `frontend/servicos/sessao.js` (new)
**Depends on**: T2
**Reuses**: Design, "servicos/sessao.js"
**Requirement**: SES-01, PROT-03, EDGE-03, SES-04 (storage half)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `abrirSessao({ id: 1, nome: 'Ryan Corsino', email: 'ryan@exemplo.com', senha: 'teste123' })` stores exactly `{"id":1,"nome":"Ryan Corsino","email":"ryan@exemplo.com"}` under `corsino:sessao` -> `tests/sessao.spec.js`
- [ ] `usuarioAtual()` returns that object; returns `null` with no key
- [ ] Invalid JSON, and JSON without `nome`, each make `usuarioAtual()` return `null` and remove the key
- [ ] `encerrarSessao()` removes the key
- [ ] `destinoSeguro` returns `biblioteca.html` and `checkout.html` unchanged, and `index.html` for `null`, `''`, `https://evil.example`, `//evil.example`, `../x.html`, `javascript:alert(1)`, `Biblioteca.html`
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T2 total + new tests pass

**Tests**: e2e (`tests/sessao.spec.js`)
**Gate**: full
**Commit**: `feat(session): store the signed-in user in sessionStorage`

---

### T4: Auth service

**What**: Create `entrar` and `cadastrar` with e-mail normalisation, password check, duplicate check and the two error types.
**Where**: `frontend/servicos/auth.js` (new)
**Depends on**: T3
**Reuses**: `api/usuarios.js` (T2)
**Requirement**: AUTH-03, AUTH-04 (rule), CAD-02 (normalisation), CAD-03 (rule), EDGE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `entrar('ryan@exemplo.com', 'teste123')` resolves with the seed user -> `tests/auth.spec.js`
- [ ] `entrar('  Ryan@Exemplo.COM ', 'teste123')` resolves with the seed user (EDGE-01)
- [ ] Wrong password and unknown e-mail each reject with `CredenciaisInvalidas`
- [ ] A communication failure (route aborted) rejects with `ErroApi`, not `CredenciaisInvalidas`
- [ ] `cadastrar({ nome: '  Ana ', email: ' Ana.X@Y.com ', senha })` sends `POST` with `nome: 'Ana'` and the e-mail lowercased and trimmed
- [ ] `cadastrar` with the seed e-mail in any case rejects with `EmailEmUso` and sends no `POST`
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T3 total + new tests pass

**Tests**: e2e (`tests/auth.spec.js`)
**Gate**: full
**Commit**: `feat(auth): add sign-in and sign-up rules over the users API`

---

### T5: Login form signs in through the API

**What**: Move `login.js` to the module `paginas/login.js`, send a valid login to `entrar`, handle success, wrong credentials, communication failure and the pending state, redirect via `voltar`, and redirect away when already signed in.
**Where**: `frontend/paginas/login.js` (new, moved code); also `frontend/login.html`, `frontend/style.css`, deleted `frontend/login.js`, `tests/login-validacao.spec.js` (login rows of the table above)
**Depends on**: T4
**Reuses**: `frontend/login.js:3-121`; `entrar` (T4); `abrirSessao`, `usuarioAtual`, `destinoSeguro` (T3)
**Requirement**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PROT-02, PROT-03 (page half), PROT-04, EDGE-02, REG-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Invalid login data shows the etapa04 messages and no request to `/usuarios` is made -> `tests/login-validacao.spec.js` (rewritten rows)
- [ ] `ryan@exemplo.com` / `teste123` opens the session and lands on `index.html`; with `?voltar=biblioteca.html` it lands on `biblioteca.html`; with `?voltar=https://evil.example` on `index.html` -> `tests/login-api.spec.js`
- [ ] Wrong password: alert "E-mail ou senha incorretos.", password field empty, no `corsino:sessao`, still on `login.html`
- [ ] Aborted route: alert "Não foi possível conectar ao servidor. Tente novamente.", e-mail and password kept
- [ ] While the route is held: "Login" button disabled with text "Entrando..."; after a failure it is enabled with text "Login" again
- [ ] Two failed submits leave exactly one alert in the form
- [ ] Opening `login.html` with a session redirects to `index.html` (or the valid `voltar`)
- [ ] `tests/login-flip.spec.js` and the remaining `tests/login-validacao.spec.js` tests pass unchanged; `frontend/login.js` no longer exists; `login.html` loads one `<script type="module">`
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T4 total + new tests pass (rewritten tests count once)

**Tests**: e2e (`tests/login-api.spec.js`, `tests/login-validacao.spec.js`)
**Gate**: full
**Commit**: `feat(login): sign in through the users API`

---

### T6: Registration form creates the account through the API

**What**: Send a valid registration to `cadastrar`, open the session and redirect on success, show the duplicate e-mail on the field, handle communication failure and the pending state.
**Where**: `frontend/paginas/login.js`; also `tests/login-validacao.spec.js` (registration rows of the table above)
**Depends on**: T5
**Reuses**: `enviar()` flow from T5; `cadastrar` (T4); `mostrarErro` (etapa04)
**Requirement**: CAD-01, CAD-02, CAD-03, CAD-04, CAD-05, CAD-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Invalid registration data shows the etapa04 messages and no request is made -> `tests/login-validacao.spec.js` (rewritten rows)
- [ ] A new unique e-mail creates exactly one record (`GET /usuarios?email=` returns one), opens a session with that `nome` and lands on `index.html` (or the valid `voltar`) -> `tests/login-api.spec.js`
- [ ] The seed e-mail shows "Este e-mail já está cadastrado." next to `#cadastro-email` with `aria-invalid="true"`, and no `POST /usuarios` is sent
- [ ] Aborted `POST`: alert "Não foi possível conectar ao servidor. Tente novamente.", the three values kept
- [ ] While the request is held: "Cadastrar" disabled with "Cadastrando..."; re-enabled with "Cadastrar" after a failure
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T5 total + new tests pass

**Tests**: e2e (`tests/login-api.spec.js`, `tests/login-validacao.spec.js`)
**Gate**: full
**Commit**: `feat(login): create the account through the users API`

---

### T7: Header shows the signed-in user on every page

**What**: Create `atualizarCabecalho` ("Olá, {first name}" + "Sair", or the "Entrar" link) and call it from every page module; add a module to `preset.html`.
**Where**: `frontend/ui/cabecalho.js` (new); also `frontend/paginas/inicio.js`, `frontend/paginas/presets.js`, `frontend/paginas/preset.js` (new), `frontend/preset.html`, `frontend/style.css`
**Depends on**: T6
**Reuses**: `.entrar` positioning (`frontend/style.css:85-105`); `usuarioAtual`, `encerrarSessao` (T3)
**Requirement**: SES-02, SES-03, SES-04, SES-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] With a session for "Ryan Corsino", `index.html`, `presets.html` and `preset.html` show "Olá, Ryan" and a "Sair" button, and no "Entrar" link -> `tests/cabecalho.spec.js`
- [ ] Without a session, they show the "Entrar" link to `login.html`
- [ ] "Sair" removes `corsino:sessao` and lands on `index.html` showing "Entrar"
- [ ] A session named `<img src=x onerror=alert(1)>` shows that text literally and creates no `<img>` in the header
- [ ] `tests/responsive.spec.js` passes unchanged
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T6 total + new tests pass

**Tests**: e2e (`tests/cabecalho.spec.js`)
**Gate**: full
**Commit**: `feat(header): show the signed-in user and a sign-out button`

---

### T8: Library requires a session

**What**: Add `paginas/biblioteca.js` that redirects to the login without a session and draws the header with one.
**Where**: `frontend/paginas/biblioteca.js` (new); also `frontend/biblioteca.html`
**Depends on**: T7
**Reuses**: `exigirLogin` (T3), `atualizarCabecalho` (T7)
**Requirement**: PROT-01, PROT-05, SES-02 (library header), REG-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Without a session, opening `biblioteca.html` ends on `login.html?voltar=biblioteca.html`, and going back does not return to `biblioteca.html` (`location.replace`) -> `tests/cabecalho.spec.js`
- [ ] With a session, `biblioteca.html` stays open and shows "Olá, Ryan"
- [ ] Full flow: signed out → `biblioteca.html` → login as the seed user → lands on `biblioteca.html`
- [ ] All slice 1 tests pass (REG-02)
- [ ] Full gate passes: `npx playwright test`, exit 0
- [ ] Test count: T7 total + new tests pass

**Tests**: e2e (`tests/cabecalho.spec.js`)
**Gate**: full
**Commit**: `feat(library): require a session to open the library`

---

## Phase Execution Map

```
Phase 1 -> Phase 2

T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8
```

Eight tasks fit one task-budgeted batch, so execution runs inline. The Verifier runs automatically after T8.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | One script + the data and config that use it | Granular (cohesive) |
| T2 | One API module, two functions | Granular |
| T3 | One service module | Granular |
| T4 | One service module | Granular |
| T5 | Script move + login submit flow | ⚠️ Largest; the move cannot be split from the first behaviour change without a half-classic, half-module page |
| T6 | Registration branch of the same flow | Granular |
| T7 | One UI module + one call per page | Granular |
| T8 | One page module | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T4 | T4 -> T5 (phase boundary) | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 | T6 -> T7 | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Mock data scripts | e2e | e2e | ✅ OK |
| T2 | API layer | e2e | e2e | ✅ OK |
| T3 | Services | e2e | e2e | ✅ OK |
| T4 | Services | e2e | e2e | ✅ OK |
| T5 | Page module, markup, styles | e2e | e2e | ✅ OK |
| T6 | Page module | e2e | e2e | ✅ OK |
| T7 | UI module, page modules, markup, styles | e2e | e2e | ✅ OK |
| T8 | Page module, markup | e2e | e2e | ✅ OK |

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| DB-01, DB-02, DB-03 | T1 |
| AUTH-02, CAD-02 | T2 (request), T4/T5/T6 (page and rules) |
| SES-01, EDGE-03 | T3 |
| PROT-03 | T3 (rule), T5 (page) |
| SES-04 | T3 (storage), T7 (button) |
| AUTH-03, EDGE-01 | T4, T5 |
| AUTH-04, CAD-03 | T4 (rule), T5/T6 (screen) |
| AUTH-01, AUTH-05, AUTH-06, PROT-02, PROT-04, EDGE-02, REG-01 | T5 |
| CAD-01, CAD-04, CAD-05, CAD-06 | T6 |
| SES-02, SES-03, SES-05 | T7 (SES-02 also T8) |
| PROT-01, PROT-05, REG-02 | T8 |

**Coverage:** 30 requirements, 30 mapped to tasks, 0 unmapped.
