# Spring Boot Skeleton, Registration and Login API (Stage 06, server part 1) - Specification

Server counterpart of `etapa06-react-catalogo`. Follows `/home/corsinoryandev/.claude/plans/vou-querer-usar-o-nested-blanket.md`, with the user's later narrowing: no database yet, and the first endpoints are registration and login, backed by the existing mock data.

## Problem Statement

The project has no server: the legacy front end talks to a json-server mock (AD-008), which stores passwords in plain text and has no rules of its own. `docs/proposta.md` commits the project to Spring Boot with an MVC architecture, with controllers, services and repositories.

This part creates the Spring Boot project in `backend/` and builds the registration and login endpoints on it. Users live in memory, seeded from `mock/db.seed.json`, behind a repository interface so PostgreSQL replaces it later without touching the other layers.

## Goals

- [ ] `backend/` is a Maven project (Java 21, Spring Boot) that builds and starts with `./mvnw`.
- [ ] `POST /auth/cadastro` creates a user, enforces the registration rules of the legacy front end on the server, and stores the password only as a BCrypt hash.
- [ ] `POST /auth/login` checks the credentials against the BCrypt hash and returns a signed JWT with the user's data.
- [ ] The code follows the layers `controller` / `service` / `repository` / `model` / `dto`, so the later database change touches only `repository`.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| PostgreSQL, JPA, Flyway, docker-compose | User: the database comes later |
| Routes that require a token, roles (admin), refresh tokens, logout, rate limiting | No protected endpoint exists yet; they come with orders and the library |
| Catalogue, orders, library, MinIO endpoints | Later slices |
| Switching the legacy or React front end to call Spring | Later slice; both keep using the json-server mock |
| Changing `mock/` | The seed is read, never written |
| Persisting users across restarts | In-memory by decision; the database slice fixes it |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Architecture | MVC as a REST API: `controller` (HTTP only), `service` (rules), `repository` (storage), `model` (entities), `dto` (JSON records); the View is the React app | User: "arquitetura mvc"; plan: Spring MVC REST, no server-side HTML | y |
| How the mock is used | `UsuarioRepository` interface with an in-memory implementation, seeded at startup from `mock/db.seed.json` | User chose option A | y |
| Maven | Maven Wrapper (`mvnw`) inside `backend/`, nothing installed system-wide | User approved the download | y |
| Package and artifact | `com.corsinotones`, artifact `backend`, Spring Boot 4.0.9, Java 21 | JDK 21 is installed; Spring Initializr only offers Boot 4.x today and 3.5 is past its open-source support window, so 4.0.9 replaces the 3.5.x first assumed (T1) | y |
| Seed location | Property `corsino.seed.arquivo`, default `../mock/db.seed.json`; WHEN the file is missing the app starts with no users and logs a warning | Works from `backend/`; tests override it with a fixture | n |
| Seeded passwords | The seed holds plain text (`teste123`); the loader hashes each with BCrypt before storing | Mock-only weakness recorded in `servicos/auth.js`; the server never keeps plain text | n |
| Registration rules | Same as the legacy form: name trimmed, at least 2 characters; e-mail trimmed, lower-cased, matching `^[^\s@]+@[^\s@]+\.[^\s@]+$`; password at least 8 characters | Parity with `frontend/paginas/login.js` | n |
| Upper bounds | Name up to 100, e-mail up to 254, password up to 72 characters | 72 is the BCrypt input limit; the others stop oversized input | n |
| Id of a new user | Largest existing id plus 1 (seed has id 1, so the first new user gets 2) | Same shape as the mock, where the server adds the id | n |
| Response of a successful registration | `201` with JSON `{id, nome, email}`; never the password or its hash | The legacy front end reads these fields | n |
| Error body | One JSON shape for every error: `{"status": <int>, "mensagem": "<text>", "campos": {"<field>": "<text>"}}`; `campos` is `{}` when no field applies | Plan: single error body via `@ControllerAdvice` | n |
| CORS | Allow `http://localhost:8080` (legacy) and `http://localhost:5173` (Vite) for `POST` and `OPTIONS` | The two front ends will call this API from the browser | n |
| Token | JWT signed HS256 with a secret read from the environment variable `CORSINO_JWT_SECRET` (at least 32 characters; the app refuses to start without it, only tests set a fixed one), claims `sub` (user id), `nome`, `email`, `iat`, `exp`, valid for 2 hours | Plan and `docs/proposta.md` choose JWT; secrets never go in git | n |
| Login response | `200` with `{token, usuario: {id, nome, email}}` | The legacy session stores the user's name and id; the token is for later protected routes | n |
| Login failure | `401` "E-mail ou senha incorretos." for both an unknown e-mail and a wrong password | Same text and same reasoning as the legacy `CredenciaisInvalidas` (do not reveal which e-mails exist) | n |
| Login input rules | Only that e-mail and password are present (after trimming the e-mail); the registration length rules are not re-applied | Legacy `senha` rule is only "not empty"; a stricter rule would lock out old accounts | n |
| Port | Spring on `8081` | 8080 is the legacy front end, 3000 the mock, 5173 Vite | n |
| Test gate | JUnit 5 and MockMvc through `./mvnw test`; Playwright stays the gate for the front ends | The plan names JUnit/MockMvc for the back end; the global rule allows tests when the project has a suite, and this one is new, so this assumption needs the user's go-ahead | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: The Spring project runs ⭐ MVP

**User Story**: As the developer, I want a Spring Boot project in `backend/`, so that the server work has a base.

**Why P1**: Registration builds on it.

**Acceptance Criteria**:

1. The `backend/` project SHALL build and pass its tests with `./mvnw test` on JDK 21.  <!-- SRV-01 -->
2. WHEN `./mvnw spring-boot:run` starts the app THEN it SHALL listen on port 8081.  <!-- SRV-02 -->
3. The source SHALL be split in the packages `controller`, `service`, `repository`, `model` and `dto` under `com.corsinotones`, where a controller depends on services and DTOs only, and only `repository` touches stored users.  <!-- SRV-03 -->
4. WHEN a browser from `http://localhost:8080` or `http://localhost:5173` sends a preflight `OPTIONS` for `POST /auth/cadastro` or `POST /auth/login` THEN the server SHALL answer allowing that origin; any other origin SHALL NOT be allowed.  <!-- SRV-04 -->
5. IF a request fails validation, hits an unknown route or raises an unexpected error THEN the server SHALL answer with the single error body (`status`, `mensagem`, `campos`) and SHALL NOT expose a stack trace.  <!-- SRV-05 -->

**Independent Test**: `./mvnw test`, then `./mvnw spring-boot:run` and `curl -i -X OPTIONS` with an `Origin` header.

---

### P1: Registration ⭐ MVP

**User Story**: As a visitor, I want to create an account, so that I can buy and keep packs later.

**Why P1**: First server feature and the base of auth.

**Acceptance Criteria**:

1. WHEN `POST /auth/cadastro` receives `{nome, email, senha}` that pass the rules THEN the server SHALL answer `201` with `{id, nome, email}`, where `nome` is trimmed and `email` is trimmed and lower-cased.  <!-- CAD-01 -->
2. The response and the logs SHALL NOT contain the password or its hash.  <!-- CAD-02 -->
3. WHEN a user is created THEN the repository SHALL hold a BCrypt hash of the password and the plain text SHALL NOT be stored.  <!-- CAD-03 -->
4. IF the trimmed name has fewer than 2 or more than 100 characters THEN the server SHALL answer `400` with `campos.nome` set to "Informe um nome com 2 a 100 caracteres."  <!-- CAD-04 -->
5. IF the trimmed e-mail does not match `^[^\s@]+@[^\s@]+\.[^\s@]+$` or has more than 254 characters THEN the server SHALL answer `400` with `campos.email` set to "Informe um e-mail válido, como nome@exemplo.com."  <!-- CAD-05 -->
6. IF the password has fewer than 8 or more than 72 characters THEN the server SHALL answer `400` with `campos.senha` set to "A senha precisa ter de 8 a 72 caracteres."  <!-- CAD-06 -->
7. IF several fields are invalid THEN the server SHALL answer one `400` listing every invalid field in `campos`.  <!-- CAD-07 -->
8. IF a field is missing or `null` THEN the server SHALL treat it as invalid with the message of its rule.  <!-- CAD-08 -->
9. IF the body is not valid JSON THEN the server SHALL answer `400` with `mensagem` "Corpo da requisição inválido." and an empty `campos`.  <!-- CAD-09 -->
10. IF the e-mail, compared after trimming and lower-casing, belongs to an existing user THEN the server SHALL answer `409` with `mensagem` "Este e-mail já está cadastrado." and SHALL NOT create a user.  <!-- CAD-10 -->
11. WHEN a user is created THEN its id SHALL be the largest existing id plus 1.  <!-- CAD-11 -->
12. IF two registrations with the same e-mail arrive at the same time THEN exactly one SHALL answer `201` and the other `409`.  <!-- CAD-12 -->

**Independent Test**: `curl -X POST localhost:8081/auth/cadastro` with a valid body, a repeated e-mail, and each invalid field.

---

### P1: Login ⭐ MVP

**User Story**: As a registered visitor, I want to sign in with my e-mail and password, so that the server recognises me.

**Why P1**: Requested together with registration; every later protected route depends on it.

**Acceptance Criteria**:

1. WHEN `POST /auth/login` receives the e-mail and password of an existing user THEN the server SHALL answer `200` with `{token, usuario: {id, nome, email}}`.  <!-- LOG-01 -->
2. The e-mail SHALL be compared after trimming and lower-casing, so `"  RYAN@exemplo.com "` signs in as `ryan@exemplo.com`.  <!-- LOG-02 -->
3. The server SHALL check the password against the stored BCrypt hash, so a seeded user signs in with the mock's plain password (`teste123`) and a user registered through `/auth/cadastro` signs in with the password given there.  <!-- LOG-03 -->
4. The token SHALL be a JWT signed with HS256 whose `sub` is the user id, with `nome` and `email` claims and an `exp` 2 hours after `iat`.  <!-- LOG-04 -->
5. IF the e-mail is unknown OR the password is wrong THEN the server SHALL answer `401` with `mensagem` "E-mail ou senha incorretos." and an empty `campos`, identical in both cases.  <!-- LOG-05 -->
6. IF the e-mail is empty or the password is empty or a field is missing THEN the server SHALL answer `400` with `campos.email` "Informe um e-mail válido, como nome@exemplo.com." and/or `campos.senha` "Informe sua senha.".  <!-- LOG-06 -->
7. IF the body is not valid JSON THEN the server SHALL answer `400` with `mensagem` "Corpo da requisição inválido." and an empty `campos`.  <!-- LOG-07 -->
8. The response and the logs SHALL NOT contain the password or its hash.  <!-- LOG-08 -->
9. IF `CORSINO_JWT_SECRET` is missing or shorter than 32 characters THEN the app SHALL fail to start with a message naming the variable.  <!-- LOG-09 -->

**Independent Test**: register through `/auth/cadastro`, then `curl -X POST localhost:8081/auth/login` with right and wrong passwords and decode the token.

---

### P2: Seed from the mock

**User Story**: As the developer, I want the server to start with the mock's users, so that the data matches what the front ends already show.

**Why P2**: Makes the duplicate-e-mail rule testable against real data and keeps parity with the mock.

**Acceptance Criteria**:

1. WHEN the app starts THEN it SHALL load every entry of `usuarios` from the configured seed file, with `id`, `nome` and `email`, and the password stored as a BCrypt hash.  <!-- SEED-01 -->
2. WHEN `ryan@exemplo.com` registers after startup with the default seed THEN the server SHALL answer `409`; WHEN a new e-mail registers THEN its id SHALL be 2.  <!-- SEED-02 -->
3. IF the seed file is missing THEN the app SHALL start with no users and log a warning.  <!-- SEED-03 -->
4. The app SHALL NOT write to the seed file or to `mock/db.json`.  <!-- SEED-04 -->

**Independent Test**: start the app and register `ryan@exemplo.com`, then `novo@exemplo.com`.

---

## Edge Cases

- E-mail casing and spaces: `"  Ryan@Exemplo.com "` collides with `ryan@exemplo.com` (CAD-10).
- A 72-character password is accepted and a 73-character one rejected (CAD-06); the boundary values are tested.
- Users disappear on restart and the seed returns; this is stated behaviour of this part (Out of Scope).

Dimensions sweep: input validation (CAD-04 to CAD-09, bounds); failure states (CAD-09, SRV-05); idempotency and duplicates (CAD-10, CAD-12); auth boundaries (LOG-04, LOG-05, LOG-09; both endpoints are public and rate limiting is out of scope); concurrency (CAD-12); data lifecycle N/A because users live only in memory until the database slice; observability (CAD-02: no secrets in logs; SEED-03 warning); external-dependency failure N/A because there is no external dependency; state transitions N/A because a user has a single state.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SRV-01 | P1: Spring project | Tasks | Pending |
| SRV-02 | P1: Spring project | Tasks | Pending |
| SRV-03 | P1: Spring project | Tasks | Pending |
| SRV-04 | P1: Spring project | Tasks | Pending |
| SRV-05 | P1: Spring project | Tasks | Pending |
| CAD-01 | P1: Registration | Tasks | Pending |
| CAD-02 | P1: Registration | Tasks | Pending |
| CAD-03 | P1: Registration | Tasks | Pending |
| CAD-04 | P1: Registration | Tasks | Pending |
| CAD-05 | P1: Registration | Tasks | Pending |
| CAD-06 | P1: Registration | Tasks | Pending |
| CAD-07 | P1: Registration | Tasks | Pending |
| CAD-08 | P1: Registration | Tasks | Pending |
| CAD-09 | P1: Registration | Tasks | Pending |
| CAD-10 | P1: Registration | Tasks | Pending |
| CAD-11 | P1: Registration | Tasks | Pending |
| CAD-12 | P1: Registration | Tasks | Pending |
| LOG-01 | P1: Login | Tasks | Pending |
| LOG-02 | P1: Login | Tasks | Pending |
| LOG-03 | P1: Login | Tasks | Pending |
| LOG-04 | P1: Login | Tasks | Pending |
| LOG-05 | P1: Login | Tasks | Pending |
| LOG-06 | P1: Login | Tasks | Pending |
| LOG-07 | P1: Login | Tasks | Pending |
| LOG-08 | P1: Login | Tasks | Pending |
| LOG-09 | P1: Login | Tasks | Pending |
| SEED-01 | P2: Seed | Tasks | Pending |
| SEED-02 | P2: Seed | Tasks | Pending |
| SEED-03 | P2: Seed | Tasks | Pending |
| SEED-04 | P2: Seed | Tasks | Pending |

**Coverage:** 30 total, 0 mapped to tasks, 30 unmapped (tasks pending).

---

## Success Criteria

- [ ] `./mvnw test` in `backend/` exits 0 with tests covering every ID above.
- [ ] `curl` against the running app reproduces a `201`, a `409`, a `400`, a login `200` with a decodable token and a login `401` with the documented bodies.
- [ ] `npx playwright test --project=legado` still passes (nothing in the front end changed).
