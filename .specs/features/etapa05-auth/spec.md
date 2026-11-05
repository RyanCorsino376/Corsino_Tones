# Login, Registration and Session against the Mock API - Specification

Slice 2 of `.specs/features/etapa05-loja/plano.md`.

## Problem Statement

The login and registration forms validate their fields but never reach a server: a valid submit only shows "Dados válidos! ... quando o servidor estiver pronto". Stage 05 still lacks its required "operation submitted to the server", and the store slices need to know who the visitor is (checkout and library require a session).

This slice sends both forms to the json-server mock, opens a browser session on success, shows who is signed in on every page header, and makes `biblioteca.html` require a session.

## Goals

- [ ] A visitor can create an account (`POST /usuarios`) and is signed in right away.
- [ ] A visitor with an account can sign in, and a wrong e-mail or password is refused with a clear message.
- [ ] Every page header shows "Olá, {first name}" and a "Sair" button while signed in, and "Entrar" otherwise.
- [ ] Opening `biblioteca.html` without a session leads to the login page and, after signing in, back to the library.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Password hashing, JWT, server-side session | The mock has no server logic; this arrives with Spring Boot (see `plano.md`, security note) |
| Server-enforced unique e-mail | json-server cannot enforce it; the client checks before creating (see Assumptions) |
| "Esqueci a senha" | No e-mail service; the link stays as it is |
| Editing or deleting the account, profile page | Not needed by the store flow |
| Rate limiting / lockout after failed logins | No server logic in the mock |
| Protecting `checkout.html` | The page does not exist yet (slice 5) |
| Library content | Slice 6 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| After registration | The new account is signed in at once and redirected like a login | User choice | y |
| After login | Redirect to the `voltar` page when valid, otherwise `index.html` | User choice | y |
| Header while signed in | "Olá, {first word of nome}" + a "Sair" button | User choice | y |
| `biblioteca.html` | Requires a session in this slice | User choice | y |
| Signed-out visit to the library (changed 2026-11-05) | A modal pop-up on `biblioteca.html` says "Faça login para acessar sua biblioteca", with "Fazer login" (to `login.html?voltar=biblioteca.html`) and "Voltar" (to `index.html`); no automatic redirect | User request after T8: the visitor should be told why before leaving the page. Supersedes the first PROT-01 (automatic `location.replace`) | y |
| Esc on the pop-up | Same as "Voltar" | A native modal closes on Esc; closing it must not leave a signed-out visitor on the library | n |
| Endpoint for users | `GET /usuarios?email=<e-mail>` and `POST /usuarios` on json-server | json-server filters by exact field value; no custom routes needed | n |
| User record | `{ id, nome, email, senha }`; seed user `Ryan Corsino`, `ryan@exemplo.com`, senha `teste123` | `senha` in plain text only because it is a mock; the seed lets tests and the demo sign in | n |
| E-mail normalisation | Trimmed and lowercased before lookup and before saving | `Ryan@Exemplo.com` and `ryan@exemplo.com` must be the same account | n |
| Password check | Done in the browser by comparing with the record returned by `GET /usuarios?email=` | The mock has no login endpoint; recorded as a known weakness of the mock | n |
| Login failure message | "E-mail ou senha incorretos." for both unknown e-mail and wrong password | Saying which one was wrong tells an attacker which e-mails have accounts | n |
| Duplicate e-mail message | "Este e-mail já está cadastrado." next to the registration e-mail field | It is a field problem, so it follows the field-message pattern of etapa04 | n |
| Communication failure message | "Não foi possível conectar ao servidor. Tente novamente." in an alert inside the form | Same cause as slice 1's error, worded for a form (no "Tentar novamente" button: the submit button is the retry) | n |
| Pending submit | Submit button disabled with text "Entrando..." / "Cadastrando..." until the request ends | Loading state for the stage, and it blocks double submits (duplicate accounts) | n |
| Session storage | `sessionStorage` key `corsino:sessao` holding `{ id, nome, email }`, never `senha` | Ends when the tab closes; storing the password in the browser would leak it | n |
| "Sair" | Removes the session and goes to `index.html` | Leaving a protected page signed out would only redirect again | n |
| `voltar` values | Accepted only if it matches `^[a-z0-9-]+\.html$`; anything else falls back to `index.html` | Prevents an open redirect such as `?voltar=https://evil.example` | n |
| Visiting `login.html` already signed in | Redirect at once to `voltar` (validated) or `index.html` | The forms are pointless with a session | n |
| Redirect method | `location.replace` after login/registration and on `login.html` with a session; the pop-up buttons use normal navigation | The back button must not return to a page that redirects again; the pop-up never redirects by itself, so its history entry is harmless | n |
| Mock data file | `mock/db.seed.json` is tracked; `mock/db.json` is git-ignored and copied from the seed when missing (`npm run api`) or on demand (`npm run api:reset`) | From this slice on the API writes; a tracked `db.json` would change on every test run | n |
| Test data | Tests that create accounts use a unique e-mail per run | Tests stay independent without resetting a server that may be shared with `npm run api` | n |
| etapa04 VAL-06 | Superseded: a valid submit now goes to the server instead of showing "Dados válidos! ..."; its tests are rewritten to the new outcome | The placeholder message only existed because there was no server | n |
| Login script | `login.js` becomes the module `paginas/login.js` | It now imports `api/` and `servicos/` (AD-009) | n |
| Spec language | English | `validate_spec.py` matches EARS keywords in English | y |

**Implicit-requirement sweep:**
- Input validation: etapa04 rules stay and run before any request (AUTH-01, CAD-01).
- Failure states: wrong credentials, duplicate e-mail and communication failure (AUTH-04, CAD-03, AUTH-05, CAD-05).
- Idempotency / duplicates: disabled button (AUTH-06, CAD-06) and the duplicate e-mail check (CAD-03).
- Auth boundaries: session contents (SES-01), the library guard (PROT-01) and `voltar` validation (PROT-03).
- Concurrency: two registrations of the same e-mail in parallel can both pass the check. N/A because the mock has a single user at a time; uniqueness moves to the server with Spring Boot.
- Data lifecycle: the session ends on "Sair" or when the tab closes (SES-04).
- Observability: request failures are already logged by `api/cliente.js` (ERR-07 of slice 1).
- External-dependency failure: AUTH-05, CAD-05.
- State transitions: signed out → signed in on login/registration, back on "Sair" (SES-*).
- Rate limits: N/A because the mock has no server logic (Out of Scope).

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Registration through the API ⭐ MVP

**User Story**: As a visitor, I want to create an account so that I can buy presets later.

**Why P1**: It is stage 05's "operation submitted to the server" (`POST`).

**Acceptance Criteria**

1. IF any registration field fails its etapa04 rule THEN the system SHALL show the field messages and SHALL NOT send any request.
2. WHEN the visitor submits a valid registration form THEN the system SHALL send `POST /usuarios` with `nome` trimmed, `email` trimmed and lowercased, and `senha`.
3. IF an account with the same normalised e-mail already exists THEN the system SHALL show "Este e-mail já está cadastrado." next to the e-mail field, mark it `aria-invalid="true"` and SHALL NOT send `POST /usuarios`.
4. WHEN `POST /usuarios` succeeds THEN the system SHALL open a session for the new account and redirect as in PROT-02.
5. IF the duplicate check or `POST /usuarios` fails to communicate THEN the system SHALL show "Não foi possível conectar ao servidor. Tente novamente." in a `role="alert"` element inside the form and SHALL keep the typed values.
6. WHILE the registration request is pending, the system SHALL disable the "Cadastrar" button and show "Cadastrando..." on it.

**Independent Test**: Register "Ana", a new e-mail and "senha1234"; the header shows "Olá, Ana" on `index.html`, and `GET /usuarios?email=` returns the new record.

---

### P1: Login through the API ⭐ MVP

**User Story**: As a visitor with an account, I want to sign in so that the store knows who I am.

**Why P1**: Checkout and library depend on it.

**Acceptance Criteria**

1. IF any login field fails its etapa04 rule THEN the system SHALL show the field messages and SHALL NOT send any request.
2. WHEN the visitor submits a valid login form THEN the system SHALL send `GET /usuarios?email=` with the e-mail trimmed and lowercased.
3. WHEN the response holds a user whose `senha` equals the typed password THEN the system SHALL open a session for that user and redirect as in PROT-02.
4. IF no user has that e-mail, or the password differs THEN the system SHALL show "E-mail ou senha incorretos." in a `role="alert"` element inside the form, SHALL NOT open a session and SHALL clear the password field.
5. IF the request fails to communicate THEN the system SHALL show "Não foi possível conectar ao servidor. Tente novamente." in a `role="alert"` element inside the form and SHALL keep the typed values.
6. WHILE the login request is pending, the system SHALL disable the "Login" button and show "Entrando..." on it.

**Independent Test**: Sign in as `ryan@exemplo.com` / `teste123`; the header shows "Olá, Ryan". Try `teste124`; the error appears and no session exists.

---

### P1: Session and header ⭐ MVP

**User Story**: As a signed-in visitor, I want to see that I am signed in and be able to sign out.

**Why P1**: Without it a visitor cannot tell whether the login worked.

**Acceptance Criteria**

1. WHEN a session opens THEN the system SHALL store `{ id, nome, email }` under `sessionStorage` key `corsino:sessao` and SHALL NOT store `senha`.
2. WHILE a session exists, the header of `index.html`, `presets.html`, `preset.html` and `biblioteca.html` SHALL show "Olá, {first word of nome}" and a "Sair" button instead of the "Entrar" link.
3. WHILE no session exists, those headers SHALL show the "Entrar" link to `login.html`.
4. WHEN the visitor activates "Sair" THEN the system SHALL remove `corsino:sessao` and go to `index.html`, whose header shows "Entrar".
5. The system SHALL write the user's name into the header as text, never as HTML.

**Independent Test**: Sign in, open `presets.html`; "Olá, Ryan" and "Sair" show. Click "Sair"; `index.html` shows "Entrar".

---

### P1: Protected library and return path ⭐ MVP

**User Story**: As a visitor, I want to be told to sign in when I open my library, and brought back afterwards.

**Why P1**: The library is personal; the same guard will protect checkout.

**Acceptance Criteria**

1. WHEN `biblioteca.html` loads without a session THEN the system SHALL open a modal dialog with the text "Faça login para acessar sua biblioteca" and the buttons "Fazer login" and "Voltar", and SHALL NOT change the location by itself.
2. WHEN a login or registration succeeds THEN the system SHALL replace the location with the `voltar` page if it is valid, otherwise with `index.html`.
3. IF `voltar` does not match `^[a-z0-9-]+\.html$` THEN the system SHALL treat it as absent.
4. WHEN `login.html` loads with a session THEN the system SHALL replace the location with the valid `voltar` page or `index.html`.
5. WHILE a session exists, `biblioteca.html` SHALL stay open and SHALL NOT show the dialog.
6. WHEN the visitor activates "Fazer login" THEN the system SHALL go to `login.html?voltar=biblioteca.html`.
7. WHEN the visitor activates "Voltar" or presses Esc on the dialog THEN the system SHALL go to `index.html`.

**Independent Test**: Signed out, open `biblioteca.html`; the pop-up appears. Click "Fazer login" and sign in; the library opens.

---

### P1: Mock data and etapa04 behaviour preserved ⭐ MVP

**User Story**: As the developer, I want tests and the demo to run on known data and the existing behaviour to keep working.

**Why P1**: Writes would otherwise make the data, and the tests, drift.

**Acceptance Criteria**

1. The system SHALL keep the mock data in `mock/db.seed.json` (presets + the seed user) and SHALL serve `mock/db.json`, created from the seed when it does not exist.
2. WHEN `npm run api:reset` runs THEN the system SHALL overwrite `mock/db.json` with `mock/db.seed.json`.
3. The system SHALL keep `mock/db.json` out of version control.
4. The system SHALL keep every etapa04 validation criterion except VAL-06 (VAL-01..05, VAL-07, EDGE-02, EDGE-03) and the `login-flip-responsive` behaviour unchanged.
5. The system SHALL keep every slice 1 criterion of `etapa05-api-modulos` satisfied.

**Independent Test**: The whole Playwright suite passes with `npm run api` running or not.

---

## Edge Cases

- IF the visitor types the e-mail with capitals or surrounding spaces at login THEN the system SHALL find the account saved in lowercase.
- WHEN a request ends, successfully or not, THEN the system SHALL re-enable the submit button and restore its original text, unless the page is being redirected.
- IF `corsino:sessao` holds text that is not valid JSON or lacks `nome` THEN the system SHALL treat it as no session and remove it.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAD-01 | P1: Registration through the API | Tasks | Implementing |
| CAD-02 | P1: Registration through the API | Tasks | Implementing |
| CAD-03 | P1: Registration through the API | Tasks | Implementing |
| CAD-04 | P1: Registration through the API | Tasks | Implementing |
| CAD-05 | P1: Registration through the API | Tasks | Implementing |
| CAD-06 | P1: Registration through the API | Tasks | Implementing |
| AUTH-01 | P1: Login through the API | Tasks | Implementing |
| AUTH-02 | P1: Login through the API | Tasks | Implementing |
| AUTH-03 | P1: Login through the API | Tasks | Implementing |
| AUTH-04 | P1: Login through the API | Tasks | Implementing |
| AUTH-05 | P1: Login through the API | Tasks | Implementing |
| AUTH-06 | P1: Login through the API | Tasks | Implementing |
| SES-01 | P1: Session and header | Tasks | Implementing |
| SES-02 | P1: Session and header | Tasks | Implementing |
| SES-03 | P1: Session and header | Tasks | Implementing |
| SES-04 | P1: Session and header | Tasks | Implementing |
| SES-05 | P1: Session and header | Tasks | Implementing |
| PROT-01 | P1: Protected library and return path | Tasks | Implementing |
| PROT-02 | P1: Protected library and return path | Tasks | Implementing |
| PROT-03 | P1: Protected library and return path | Tasks | Implementing |
| PROT-04 | P1: Protected library and return path | Tasks | Implementing |
| PROT-05 | P1: Protected library and return path | Tasks | Implementing |
| PROT-06 | P1: Protected library and return path | Tasks | Implementing |
| PROT-07 | P1: Protected library and return path | Tasks | Implementing |
| DB-01 | P1: Mock data and etapa04 behaviour preserved | Tasks | Implementing |
| DB-02 | P1: Mock data and etapa04 behaviour preserved | Tasks | Implementing |
| DB-03 | P1: Mock data and etapa04 behaviour preserved | Tasks | Implementing |
| REG-01 | P1: Mock data and etapa04 behaviour preserved | Tasks | Implementing |
| REG-02 | P1: Mock data and etapa04 behaviour preserved | Tasks | Implementing |
| EDGE-01 | Edge cases | Tasks | Implementing |
| EDGE-02 | Edge cases | Tasks | Implementing |
| EDGE-03 | Edge cases | Tasks | Implementing |

**ID format:** `[CATEGORY]-[NUMBER]`. `REG-*` and `EDGE-*` are scoped to this feature.

**Status values:** Pending -> In Design -> In Tasks -> Implementing -> Verified

**Coverage:** 32 total, 32 mapped to tasks (see `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] Registering a new account creates exactly one record in `GET /usuarios` and leaves the visitor signed in.
- [ ] No path signs a visitor in with a wrong password.
- [ ] `sessionStorage` never contains the password.
- [ ] The full Playwright suite passes, including the rewritten VAL-06 tests.
