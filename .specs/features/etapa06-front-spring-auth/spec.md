# Legacy Front End on the Spring Auth API (Stage 06, server part 2) - Specification

Connects `frontend/login.html` to `POST /auth/cadastro` and `POST /auth/login` of `etapa06-spring-cadastro`. Everything else (packs, presets, orders) stays on the json-server mock.

## Problem Statement

The sign-in and registration forms still talk to the json-server mock: the password is compared in the browser (`frontend/servicos/auth.js`, "mock-only weakness") and stored in plain text. The Spring API now hashes passwords, enforces the rules on the server and signs tokens, but no page calls it.

This part makes the legacy front end register and sign in through Spring, with the same screens, texts and session behaviour, and makes the Playwright suite exercise the real server.

## Goals

- [ ] Registration and login in `frontend/` go through the Spring API, and the browser never reads or compares a password.
- [ ] The visible behaviour of `login.html` (texts, pending state, redirect, session) is unchanged.
- [ ] `npx playwright test` passes with Spring started by Playwright and at least one test that registers and signs in through the real server.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Sending the JWT with later requests, protected routes, token expiry handling | No protected endpoint exists; orders still go to the mock |
| Storing the token in the browser | Nothing reads it yet; avoids a stored credential without a use |
| Moving packs, presets, orders or the library to Spring | Later slices |
| The React app (`etapa06-react-catalogo`) | Separate feature; it will reuse this API |
| Closing the Verifier gaps of `etapa06-spring-cadastro` | User deferred them |
| Removing `/usuarios` from `mock/db.seed.json` | The Spring seed reads it |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Which front end | Legacy `frontend/`, the only one with a login page today | The React app does not exist yet | y |
| Spring URL | `http://127.0.0.1:8081`, defined only in `frontend/api/cliente.js` next to the mock `BASE_URL` | AD-008/AD-009: one place for base URLs, only `api/` calls `fetch` | n |
| New module | `frontend/api/auth.js` replaces `frontend/api/usuarios.js`, which is deleted with its spec `tests/api-usuarios.spec.js` | The `/usuarios` calls would be dead code; `tests/api-auth.spec.js` replaces it | n |
| Service functions | `entrar` and `cadastrar` keep their names and error classes (`CredenciaisInvalidas`, `EmailEmUso`, `ErroApi`); both resolve with `{id, nome, email}` | `login.js` and the session module stay unchanged | n |
| Status mapping | `401` on login becomes `CredenciaisInvalidas`; `409` on registration becomes `EmailEmUso`; every other failure stays an `ErroApi` | The Spring contract of `etapa06-spring-cadastro` | n |
| Server field errors | A `400` with `campos` shows each message next to its field (`nome`, `email`, `senha` map to `cadastro-nome`, `cadastro-email`, `cadastro-senha` on registration and `email`, `senha` on login) | The server also rejects values the form does not check (name over 100, password over 72) | n |
| CORS | Spring also allows `http://127.0.0.1:8080` and `http://127.0.0.1:5173` | Playwright and the dev server use `127.0.0.1`, a different origin from `localhost` | n |
| Test server | `playwright.config.js` starts Spring with `./mvnw spring-boot:run` in `backend/`, waits for port 8081 and sets a test-only `CORSINO_JWT_SECRET`; an already running Spring is reused | Same pattern as the mock server | n |
| Test style | Unit-level tests intercept `http://127.0.0.1:8081/**` with `page.route`; real-server tests use unique e-mails because Spring keeps users in memory | Existing suite style; the Spring state is shared across tests | n |
| Seed user | `ryan@exemplo.com` / `teste123` exists in Spring from the mock seed | Spring seed (SEED-01) | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Sign in through Spring ⭐ MVP

**User Story**: As a registered visitor, I want the login form to check my credentials on the server, so that my password is never compared in the browser.

**Why P1**: Removes the mock-only weakness.

**Acceptance Criteria**:

1. WHEN the visitor submits valid login fields THEN the page SHALL send `POST http://127.0.0.1:8081/auth/login` with a JSON body holding `email` and `senha`, and SHALL NOT call `GET /usuarios` on the mock.  <!-- WEB-01 -->
2. WHEN the server answers `200` THEN `entrar` SHALL resolve with `{id, nome, email}` of the answer's `usuario`, the page SHALL open the session with exactly those three fields and redirect as it does today.  <!-- WEB-02 -->
3. WHEN the server answers `401` THEN `entrar` SHALL reject with `CredenciaisInvalidas` and the page SHALL show "E-mail ou senha incorretos." and clear the password field.  <!-- WEB-03 -->
4. IF the server answers `400` with `campos` THEN the page SHALL show each message next to its field and focus the first invalid field.  <!-- WEB-04 -->
5. IF the request fails with no answer, a timeout or any other status THEN the page SHALL show "Não foi possível conectar ao servidor. Tente novamente." and `entrar` SHALL reject with `ErroApi`.  <!-- WEB-05 -->
6. The browser SHALL NOT store the password or the token in `sessionStorage` or `localStorage`.  <!-- WEB-06 -->

**Independent Test**: start Spring and the static server, sign in as `ryan@exemplo.com`, then with a wrong password.

---

### P1: Register through Spring ⭐ MVP

**User Story**: As a visitor, I want the registration form to create my account on the server, so that my password is stored hashed.

**Why P1**: The other half of the same slice.

**Acceptance Criteria**:

1. WHEN the visitor submits valid registration fields THEN the page SHALL send `POST http://127.0.0.1:8081/auth/cadastro` with a JSON body holding `nome`, `email` and `senha`, and SHALL NOT call `/usuarios` on the mock.  <!-- WEB-07 -->
2. WHEN the server answers `201` THEN `cadastrar` SHALL resolve with `{id, nome, email}` and the page SHALL open the session and redirect as it does today.  <!-- WEB-08 -->
3. WHEN the server answers `409` THEN `cadastrar` SHALL reject with `EmailEmUso` and the page SHALL show "Este e-mail já está cadastrado." next to the e-mail field and focus it.  <!-- WEB-09 -->
4. IF the server answers `400` with `campos` THEN the page SHALL show each message next to its field and focus the first invalid field.  <!-- WEB-10 -->
5. IF the request fails with no answer, a timeout or any other status THEN the page SHALL show "Não foi possível conectar ao servidor. Tente novamente." and `cadastrar` SHALL reject with `ErroApi`.  <!-- WEB-11 -->
6. WHILE a request is pending the submit button SHALL stay disabled with its pending text ("Entrando..." or "Cadastrando..."), as today.  <!-- WEB-12 -->

**Independent Test**: register a new e-mail, see the redirect, register it again and see the duplicate message.

---

### P1: Server and tests support the connection ⭐ MVP

**User Story**: As the developer, I want the browser allowed to call Spring and the suite to start it, so that the integration is tested for real.

**Why P1**: Without CORS the browser blocks every call.

**Acceptance Criteria**:

1. WHEN a browser from `http://127.0.0.1:8080` or `http://127.0.0.1:5173` sends a preflight `OPTIONS` for `POST /auth/login` or `/auth/cadastro` THEN the server SHALL answer allowing that origin, in addition to the two `localhost` origins already allowed; any other origin SHALL still be refused.  <!-- WEB-13 -->
2. WHEN `npx playwright test` runs THEN it SHALL start Spring on port 8081 (or reuse a running one) before the tests.  <!-- WEB-14 -->
3. WHEN a Playwright test registers a new e-mail through the page against the real server THEN it SHALL reach the redirect target and have a session with that user's `id`, `nome` and `email`; a second page load SHALL sign in with the same e-mail and password.  <!-- WEB-15 -->
4. WHEN `ryan@exemplo.com` signs in with `teste123` through the page against the real server THEN the session SHALL hold id 1, "Ryan Corsino" and that e-mail.  <!-- WEB-16 -->

**Independent Test**: `npx playwright test tests/login-spring.spec.js` from a clean checkout with Spring not running.

---

## Edge Cases

- A password the server accepts but the old mock did not compare exactly (spaces in the password) SHALL be sent unchanged, not trimmed.  <!-- WEB-17 -->
- E-mail casing and surrounding spaces SHALL be sent as typed; normalisation is the server's rule.  <!-- WEB-18 -->
- Without Spring running the login and registration pages SHALL show the connection message (WEB-05, WEB-11) and the packs, cart and checkout pages SHALL keep working on the mock.  <!-- WEB-19 -->

Dimensions sweep: input validation (WEB-04, WEB-10, WEB-17, WEB-18); failure states (WEB-05, WEB-11, WEB-19); idempotency and duplicates (WEB-09, WEB-12); auth boundaries (WEB-06, WEB-13); concurrency N/A because each form submit is one request guarded by the disabled button; data lifecycle N/A because Spring users live in memory until the database slice; observability kept (the API layer logs every failure to `console.error`); external-dependency failure (WEB-05, WEB-11, WEB-19); state transitions N/A because the session is open or closed as today.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| WEB-01 | P1: Sign in | Tasks | Pending |
| WEB-02 | P1: Sign in | Tasks | Pending |
| WEB-03 | P1: Sign in | Tasks | Pending |
| WEB-04 | P1: Sign in | Tasks | Pending |
| WEB-05 | P1: Sign in | Tasks | Pending |
| WEB-06 | P1: Sign in | Tasks | Pending |
| WEB-07 | P1: Register | Tasks | Pending |
| WEB-08 | P1: Register | Tasks | Pending |
| WEB-09 | P1: Register | Tasks | Pending |
| WEB-10 | P1: Register | Tasks | Pending |
| WEB-11 | P1: Register | Tasks | Pending |
| WEB-12 | P1: Register | Tasks | Pending |
| WEB-13 | P1: Server and tests | Tasks | Pending |
| WEB-14 | P1: Server and tests | Tasks | Pending |
| WEB-15 | P1: Server and tests | Tasks | Pending |
| WEB-16 | P1: Server and tests | Tasks | Pending |
| WEB-17 | Edge cases | Tasks | Pending |
| WEB-18 | Edge cases | Tasks | Pending |
| WEB-19 | Edge cases | Tasks | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped (tasks pending).

---

## Success Criteria

- [ ] `npx playwright test` passes with the rewritten auth tests and the new real-server tests.
- [ ] `cd backend && ./mvnw -q clean test` still passes with the extended CORS list.
- [ ] No request to `/usuarios` on the mock is made by any page or service in `frontend/`.
