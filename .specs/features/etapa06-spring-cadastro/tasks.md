# Spring Skeleton, Registration and Login - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/etapa06-spring-cadastro/spec.md`
**Design**: `.specs/features/etapa06-spring-cadastro/design.md`
**Status**: Draft

Code comments and commit messages are in English (global rule). Java sources live under `backend/src/main/java/com/corsinotones/`, tests under `backend/src/test/java/com/corsinotones/`; below, `X` means that package root.

---

## Test Coverage Matrix

> Generated from the spec and the plan - confirm before Execute. Guidelines found: none for Java (`backend/` is new; `tests/*.spec.js` is Playwright for the front end); strong defaults applied. The user approved creating a JUnit suite when approving the spec.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Service (`AuthService`, `TokenService`) | unit | All branches; 1:1 to spec ACs; every listed edge case | `X/service/*Test.java` | `./mvnw test` |
| Repository (in-memory, seed loader) | unit / integration | Key paths + failure paths (missing file, duplicate, concurrent create) | `X/repository/*Test.java` | `./mvnw test` |
| Controller and error handler | integration (MockMvc, full context) | Every route: happy + each invalid field + error paths | `X/controller/*Test.java` | `./mvnw test` |
| DTO validation | unit (Jakarta `Validator`) | Boundaries of every rule (min, max, null, whitespace) | `X/dto/*Test.java` | `./mvnw test` |
| Config (security, JWT) | integration | CORS allowed and denied origin; startup failure on a bad secret | `X/config/*Test.java` | `./mvnw test` |
| Model, exceptions, response DTOs | none | - (build gate only) | - | `./mvnw test` (compiles) |

## Gate Check Commands

> Generated from the plan (`./mvnw test`, `./mvnw spring-boot:run`) - confirm before Execute. No Java linter is configured; the compiler with `-Xlint:all` is the static check.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | While working on a task | `cd backend && ./mvnw -q test -Dtest=<TestClass>` |
| Full | Before every commit | `cd backend && ./mvnw -q test` |
| Build | After the last task | `cd backend && ./mvnw -q verify` and `npx playwright test --project=legado` is not run here (front end untouched) |

Baseline before T1: `backend/` does not exist.

---

## Execution Plan

### Phase 1: Project and storage

```
T1 -> T2 -> T3 -> T4
```

### Phase 2: Security and errors

```
T5 -> T6 -> T7 -> T8
```

### Phase 3: Registration

```
T9 -> T10 -> T11 -> T12
```

### Phase 4: Seed

```
T13
```

### Phase 5: Login

```
T14 -> T15 -> T16 -> T17 -> T18 -> T19
```

---

## Task Breakdown

### T1: Create the Maven project and a smoke test

**What**: Generate `backend/` with the Maven Wrapper, Spring Boot 4.0.9, Java 21 and the starters of the design; port 8081; ignore `backend/target/`.
**Where**: `backend/pom.xml`
**Depends on**: None
**Reuses**: `.gitignore` conventions
**Requirement**: SRV-01, SRV-02

**Tools**:

- MCP: `context7`
- Skill: NONE

**Done when**:

- [x] `backend/mvnw` exists and `./mvnw -v` prints Java 21
- [x] `application.properties` sets `server.port=8081`; `application.properties` reads `corsino.jwt.secret` from `CORSINO_JWT_SECRET`, and the Surefire plugin sets a fixed 32+ character value for tests (a test `application.properties` would shadow the main one)
- [x] A test asserts the context loads and `server.port` is `8081`
- [x] Gate passes: `cd backend && ./mvnw -q test`
- [x] Test count: 1 test passes

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): create the Spring Boot project`

---

### T2: Add the Usuario model

**What**: `record Usuario(long id, String nome, String email, String senhaHash)`.
**Where**: `backend/src/main/java/com/corsinotones/model/Usuario.java`
**Depends on**: T1
**Requirement**: SRV-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Record compiles with the four fields
- [x] Gate passes: `cd backend && ./mvnw -q test`
- [x] Test count: 1 test passes (no silent deletions)

**Tests**: none
**Gate**: full

**Commit**: `feat(backend): add the Usuario model`

---

### T3: Define the UsuarioRepository interface

**What**: Interface with `buscarPorEmail`, `criar` (empty when the e-mail exists; id = largest id + 1) and `carregar`, each documented with a one-line comment.
**Where**: `backend/src/main/java/com/corsinotones/repository/UsuarioRepository.java`
**Depends on**: T2
**Requirement**: SRV-03, CAD-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Interface matches the design signatures
- [x] Gate passes: `cd backend && ./mvnw -q test`
- [x] Test count: 1 test passes (no silent deletions)

**Tests**: none
**Gate**: full

**Commit**: `feat(backend): define the UsuarioRepository interface`

---

### T4: Implement the in-memory repository

**What**: `UsuarioRepositoryEmMemoria` with a `ConcurrentHashMap` keyed by e-mail and `synchronized` `criar` and `carregar`.
**Where**: `backend/src/main/java/com/corsinotones/repository/UsuarioRepositoryEmMemoria.java`
**Depends on**: T3
**Requirement**: CAD-11, CAD-12, SEED-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] First `criar` on an empty repository gets id 1; after `carregar` of ids 1 and 5, the next `criar` gets 6 (differing ids, so a "count + 1" shortcut fails)
- [ ] `criar` with an existing e-mail returns empty and leaves the stored user unchanged
- [ ] 20 threads calling `criar` with the same e-mail produce exactly one success
- [ ] `buscarPorEmail` returns empty for an unknown e-mail
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 5 tests pass (no silent deletions)

**Tests**: unit
**Gate**: full

**Commit**: `feat(backend): add the in-memory user repository`

---

### T5: Configure security, CORS and the password encoder

**What**: `SegurancaConfig` with CSRF off, every request permitted, CORS for `http://localhost:8080` and `http://localhost:5173` (methods `POST`, `OPTIONS`, header `Content-Type`), and a `BCryptPasswordEncoder` bean.
**Where**: `backend/src/main/java/com/corsinotones/config/SegurancaConfig.java`
**Depends on**: None (previous phase complete)
**Requirement**: SRV-04

**Tools**:

- MCP: `context7`
- Skill: NONE

**Done when**:

- [ ] Preflight `OPTIONS /auth/cadastro` and `/auth/login` from each allowed origin answers 200 with `Access-Control-Allow-Origin` equal to that origin
- [ ] Preflight from `http://evil.example` and from `http://localhost:3000` is rejected (403, no allow-origin header)
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 4 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): configure CORS and the password encoder`

---

### T6: Add the domain exceptions

**What**: `EmailEmUso` and `CredenciaisInvalidas` as unchecked exceptions with the texts of the spec.
**Where**: `backend/src/main/java/com/corsinotones/service/EmailEmUso.java`
**Depends on**: T5
**Requirement**: CAD-10, LOG-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `EmailEmUso` message is "Este e-mail já está cadastrado."
- [ ] `CredenciaisInvalidas` (same package, own file) message is "E-mail ou senha incorretos."
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 5 tests pass (no silent deletions)

**Tests**: none
**Gate**: full

**Commit**: `feat(backend): add the domain exceptions`

---

### T7: Add the error response DTO

**What**: `record ErroResposta(int status, String mensagem, Map<String,String> campos)` with a factory for an empty `campos`.
**Where**: `backend/src/main/java/com/corsinotones/dto/ErroResposta.java`
**Depends on**: T6
**Requirement**: SRV-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Record compiles; JSON has exactly `status`, `mensagem`, `campos`
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 5 tests pass (no silent deletions)

**Tests**: none
**Gate**: full

**Commit**: `feat(backend): add the error response body`

---

### T8: Add the global error handler

**What**: `ErroHandler` mapping each exception of the design to the single error body.
**Where**: `backend/src/main/java/com/corsinotones/controller/ErroHandler.java`
**Depends on**: T7
**Requirement**: SRV-05, CAD-09, CAD-10, LOG-05, LOG-07

**Tools**:

- MCP: `context7`
- Skill: NONE

**Done when**:

- [ ] A test-only controller (under `src/test`) proves: invalid `@Valid` body -> 400 with `campos` per field; broken JSON -> 400 "Corpo da requisição inválido." and empty `campos`; thrown `EmailEmUso` -> 409; thrown `CredenciaisInvalidas` -> 401 with empty `campos`; thrown `RuntimeException("segredo")` -> 500 "Erro interno do servidor." with no "segredo" or stack trace in the body
- [ ] Unknown route -> 404 "Rota não encontrada."; wrong method on a known route -> 405 "Método não permitido."
- [ ] Every body has the keys `status`, `mensagem`, `campos`
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 8 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): add the global error handler`

---

### T9: Add CadastroRequest with its validation

**What**: `CadastroRequest(nome, email, senha)` whose constructor trims `nome` and `email`, with `@NotNull`, `@Size` and `@Pattern` carrying the CAD-04 to CAD-06 messages.
**Where**: `backend/src/main/java/com/corsinotones/dto/CadastroRequest.java`
**Depends on**: None (previous phase complete)
**Reuses**: regex and texts of `frontend/paginas/login.js:57-67`
**Requirement**: CAD-04, CAD-05, CAD-06, CAD-07, CAD-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Name: `"A"` and 101 characters invalid; `"Al"` and 100 valid; `"   A  "` invalid (trimmed); `null` invalid, each with the CAD-04 message
- [ ] E-mail: `"a@b"` , `"a b@c.d"`, 255 characters invalid with the CAD-05 message; `"x@y.z"` valid; `"  Ana@Y.Z "` is stored trimmed; `null` invalid
- [ ] Password: 7 characters invalid; 8 and 72 valid; 73 invalid; `null` invalid, each with the CAD-06 message
- [ ] A string embedding a valid e-mail inside invalid text (`"ruim a@b.c ruim"`) is rejected (anchored regex)
- [ ] All three fields invalid -> three violations, one per field
- [ ] Gate passes: `cd backend && ./mvnw -q test -Dtest=CadastroRequestTest`
- [ ] Test count: 12 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(backend): validate the registration request`

---

### T10: Add the UsuarioResponse DTO

**What**: `record UsuarioResponse(long id, String nome, String email)` with a `de(Usuario)` factory that leaves the hash out.
**Where**: `backend/src/main/java/com/corsinotones/dto/UsuarioResponse.java`
**Depends on**: T9
**Requirement**: CAD-01, CAD-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Record has no password or hash field
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 17 tests pass (no silent deletions)

**Tests**: none
**Gate**: full

**Commit**: `feat(backend): add the user response body`

---

### T11: Implement AuthService.cadastrar

**What**: Normalise the e-mail (trim, lower-case), hash the password with the `PasswordEncoder`, call `repositorio.criar`, throw `EmailEmUso` when it returns empty.
**Where**: `backend/src/main/java/com/corsinotones/service/AuthService.java`
**Depends on**: T10
**Reuses**: `normalizarEmail` of `frontend/servicos/auth.js:21`
**Requirement**: CAD-01, CAD-03, CAD-10, CAD-11, CAD-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The stored user's e-mail is lower-case and its `senhaHash` differs from the plain password and `matches` it
- [ ] Registering `"  RYAN@Exemplo.com "` when `ryan@exemplo.com` exists throws `EmailEmUso` and the repository still holds one user
- [ ] Two sequential registrations get consecutive ids
- [ ] 20 threads registering the same e-mail: exactly one returns a user, 19 throw `EmailEmUso`
- [ ] Gate passes: `cd backend && ./mvnw -q test -Dtest=AuthServiceTest`
- [ ] Test count: 5 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(backend): add the registration service`

---

### T12: Add POST /auth/cadastro

**What**: `AuthController` with `POST /auth/cadastro` answering `201` and a `UsuarioResponse`; plus a structure test for the layers.
**Where**: `backend/src/main/java/com/corsinotones/controller/AuthController.java`
**Depends on**: T11
**Requirement**: SRV-03, CAD-01, CAD-02, CAD-04, CAD-05, CAD-06, CAD-07, CAD-08, CAD-09, CAD-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Valid body -> 201 with exactly `id`, `nome`, `email` (no `senha` or hash key anywhere in the body)
- [ ] Each invalid field, all fields invalid, a missing field and a `null` field -> 400 with the documented `campos`
- [ ] Broken JSON -> 400 "Corpo da requisição inválido."
- [ ] Repeating an e-mail in another case -> 409 "Este e-mail já está cadastrado."
- [ ] The captured application log of a registration does not contain the plain password or its hash (CAD-02)
- [ ] Structure test: the five packages exist under `com.corsinotones`, and `AuthController` has no constructor parameter or field from `repository`
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 8 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): add the registration endpoint`

---

### T13: Seed users from the mock

**What**: `SementeUsuarios` (`ApplicationRunner`) reading `corsino.seed.arquivo` (default `../mock/db.seed.json`), hashing each password and calling `carregar`; missing file logs a warning.
**Where**: `backend/src/main/java/com/corsinotones/repository/SementeUsuarios.java`
**Depends on**: None (previous phase complete)
**Requirement**: SEED-01, SEED-02, SEED-03, SEED-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] With the default seed, registering `ryan@exemplo.com` -> 409 and registering `novo@exemplo.com` -> 201 with id 2
- [ ] A fixture seed with ids 3 and 7 (two users) loads both and the next registration gets id 8; the stored hash is not the fixture's plain password
- [ ] A missing seed path starts the app with no users (a registration gets id 1) and logs a warning
- [ ] The seed file's bytes and `mock/db.json` modification time are the same before and after startup and a registration
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 4 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): seed users from the mock data`

---

### T14: Add LoginRequest with its validation

**What**: `LoginRequest(email, senha)` trimming the e-mail, `@NotEmpty` on both with the LOG-06 messages.
**Where**: `backend/src/main/java/com/corsinotones/dto/LoginRequest.java`
**Depends on**: None (previous phase complete)
**Requirement**: LOG-02, LOG-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Empty, `"   "` (e-mail, after trim) and `null` e-mail invalid with "Informe um e-mail válido, como nome@exemplo.com."
- [ ] Empty and `null` password invalid with "Informe sua senha."; a 3-character password valid (no length rule on login)
- [ ] `"  RYAN@Exemplo.com "` kept as the trimmed text (lower-casing is the service's job)
- [ ] Gate passes: `cd backend && ./mvnw -q test -Dtest=LoginRequestTest`
- [ ] Test count: 5 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(backend): validate the login request`

---

### T15: Add the LoginResponse DTO

**What**: `record LoginResponse(String token, UsuarioResponse usuario)`.
**Where**: `backend/src/main/java/com/corsinotones/dto/LoginResponse.java`
**Depends on**: T14
**Requirement**: LOG-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] JSON has exactly `token` and `usuario`
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: all earlier tests pass (no silent deletions)

**Tests**: none
**Gate**: full

**Commit**: `feat(backend): add the login response body`

---

### T16: Configure the JWT encoder and secret check

**What**: `JwtConfig` exposing a Nimbus HS256 `JwtEncoder`, a `JwtDecoder` for tests and later routes, and a `Clock`; fails startup when the secret is blank or under 32 characters.
**Where**: `backend/src/main/java/com/corsinotones/config/JwtConfig.java`
**Depends on**: T15
**Requirement**: LOG-04, LOG-09

**Tools**:

- MCP: `context7`
- Skill: NONE

**Done when**:

- [ ] Secret API confirmed against the Spring Security 6.5 docs and the choice noted in the commit body (design risk)
- [ ] An `ApplicationContextRunner` test: missing secret, blank secret and a 31-character secret each fail to start with a message containing `CORSINO_JWT_SECRET`; a 32-character secret starts
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 4 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): configure the JWT encoder`

---

### T17: Implement TokenService

**What**: `gerar(Usuario)` building a JWT with `sub` (id as text), `nome`, `email`, `iat` and `exp = iat + 2h` from the injected `Clock`.
**Where**: `backend/src/main/java/com/corsinotones/service/TokenService.java`
**Depends on**: T16
**Requirement**: LOG-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] With a fixed clock, decoding the token with the secret gives `sub` equal to the id (user id 7, not 1), the user's `nome` and `email`, and `exp - iat` equal to 7200 seconds
- [ ] The header algorithm is `HS256`
- [ ] A token decoded with a different secret is rejected
- [ ] Gate passes: `cd backend && ./mvnw -q test -Dtest=TokenServiceTest`
- [ ] Test count: 3 new tests pass

**Tests**: unit
**Gate**: quick

**Commit**: `feat(backend): issue signed access tokens`

---

### T18: Implement AuthService.entrar

**What**: Find the user by normalised e-mail, compare the password with the hash (against a dummy hash when the e-mail is unknown), throw `CredenciaisInvalidas`, return the user and a token.
**Where**: `backend/src/main/java/com/corsinotones/service/AuthService.java` (modify)
**Depends on**: T17
**Reuses**: `entrar` of `frontend/servicos/auth.js:29`
**Requirement**: LOG-02, LOG-03, LOG-05, LOG-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A registered user signs in with the password given at registration; `"  RYAN@exemplo.com "` signs in as the seeded user with `teste123`
- [ ] Wrong password and unknown e-mail both throw `CredenciaisInvalidas` with the same message
- [ ] The encoder's `matches` is called on both failure paths (timing guard)
- [ ] The returned session holds no hash field outside the `Usuario` record and the log of a login does not contain the password
- [ ] Gate passes: `cd backend && ./mvnw -q test -Dtest=AuthServiceTest`
- [ ] Test count: 5 new tests pass in this class (10 total there)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(backend): add the login service`

---

### T19: Add POST /auth/login

**What**: `POST /auth/login` on `AuthController` answering `200` and a `LoginResponse`.
**Where**: `backend/src/main/java/com/corsinotones/controller/AuthController.java` (modify)
**Depends on**: T18
**Requirement**: LOG-01, LOG-02, LOG-03, LOG-05, LOG-06, LOG-07, LOG-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Register then login -> 200 with `token` and `usuario` (id, nome, email only); the token decodes to that user
- [ ] Seeded `ryan@exemplo.com` / `teste123` -> 200 with id 1
- [ ] Wrong password and unknown e-mail -> identical 401 bodies with "E-mail ou senha incorretos." and empty `campos`
- [ ] Empty e-mail and empty password -> 400 with `campos.email` and `campos.senha` texts; missing fields behave the same; broken JSON -> 400 "Corpo da requisição inválido."
- [ ] The response and the captured log never contain the password or a hash
- [ ] Gate passes: `cd backend && ./mvnw -q test`
- [ ] Test count: 7 new tests pass

**Tests**: integration
**Gate**: full

**Commit**: `feat(backend): add the login endpoint`

---

## Phase Execution Map

```
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5

Phase 1:  T1 ------> T2 ------> T3 ------> T4
Phase 2:  T5 ------> T6 ------> T7 ------> T8
Phase 3:  T9 ------> T10 -----> T11 -----> T12
Phase 4:  T13
Phase 5:  T14 -----> T15 -----> T16 -----> T17 -----> T18 -----> T19
```

Execution is strictly sequential. 19 tasks pack into three ~7-task batches: Phases 1-2 (8 tasks), Phases 3-4 (5 tasks) and Phase 5 (6 tasks); sub-agents are offered at Execute.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | none | ✅ Match |
| T2 | T1 | T1 | ✅ Match |
| T3 | T2 | T2 | ✅ Match |
| T4 | T3 | T3 | ✅ Match |
| T5 | T4 | previous phase | ✅ Match |
| T6 | T5 | T5 | ✅ Match |
| T7 | T6 | T6 | ✅ Match |
| T8 | T7 | T7 | ✅ Match |
| T9 | T8 | previous phase | ✅ Match |
| T10 | T9 | T9 | ✅ Match |
| T11 | T10 | T10 | ✅ Match |
| T12 | T11 | T11 | ✅ Match |
| T13 | T12 | previous phase | ✅ Match |
| T14 | T13 | previous phase | ✅ Match |
| T15 | T14 | T14 | ✅ Match |
| T16 | T15 | T15 | ✅ Match |
| T17 | T16 | T16 | ✅ Match |
| T18 | T17 | T17 | ✅ Match |
| T19 | T18 | T18 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Project skeleton and config | integration (context loads) | integration | ✅ OK |
| T2 | Model | none | none | ✅ OK |
| T3 | Repository interface | none (no behaviour) | none | ✅ OK |
| T4 | Repository | unit | unit | ✅ OK |
| T5 | Config | integration | integration | ✅ OK |
| T6 | Exceptions | none | none | ✅ OK |
| T7 | Response DTO | none | none | ✅ OK |
| T8 | Controller (error handler) | integration | integration | ✅ OK |
| T9 | DTO validation | unit | unit | ✅ OK |
| T10 | Response DTO | none | none | ✅ OK |
| T11 | Service | unit | unit | ✅ OK |
| T12 | Controller | integration | integration | ✅ OK |
| T13 | Repository (seed) | integration | integration | ✅ OK |
| T14 | DTO validation | unit | unit | ✅ OK |
| T15 | Response DTO | none | none | ✅ OK |
| T16 | Config | integration | integration | ✅ OK |
| T17 | Service | unit | unit | ✅ OK |
| T18 | Service | unit | unit | ✅ OK |
| T19 | Controller | integration | integration | ✅ OK |

---

## Requirement Coverage

SRV-01, SRV-02: T1 · SRV-03: T2, T3, T12 · SRV-04: T5 · SRV-05: T7, T8 · CAD-01: T10, T11, T12 · CAD-02: T10, T12 · CAD-03: T11 · CAD-04 to CAD-08: T9, T12 · CAD-09: T8, T12 · CAD-10: T6, T8, T11, T12 · CAD-11: T3, T4, T11 · CAD-12: T4, T11 · LOG-01: T15, T19 · LOG-02: T14, T18, T19 · LOG-03: T18, T19 · LOG-04: T16, T17 · LOG-05: T6, T8, T18, T19 · LOG-06: T14, T19 · LOG-07: T8, T19 · LOG-08: T18, T19 · LOG-09: T16 · SEED-01 to SEED-04: T13.
