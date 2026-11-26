# Stage 07 Persistence - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/etapa07-persistencia/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none (no `AGENTS.md`, `CONTRIBUTING.md` or coverage thresholds in `backend/pom.xml`) - strong defaults applied. Style samples: `backend/src/test/java/com/corsinotones/service/AuthServiceTest.java` (plain JUnit + in-memory fake), `controller/AuthControllerCadastroTest.java` (`@SpringBootTest` + MockMvc), `repository/SementeUsuarios*Test.java` (context per property set).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migrations (SQL) | integration | Every table, key, constraint and seeded value of DB-01 to DB-07 | `backend/src/test/java/com/corsinotones/repository/jpa/Migracoes*Test.java` | `cd backend && ./mvnw -q test -Dtest='Migracoes*Test'` |
| Repository adapters (`repository/jpa`) | integration | Key queries, fetch joins, `Duplicado`/`EmUso` translation, explicit-id seed insert | `backend/src/test/java/com/corsinotones/repository/jpa/*Test.java` | `cd backend && ./mvnw -q clean test` |
| Service | unit | All branches; 1:1 to spec ACs; every listed edge case (slug, bounds, unknown ids, repeats) | `backend/src/test/java/com/corsinotones/service/*Test.java` | `cd backend && ./mvnw -q test -Dtest='*ServiceTest'` |
| Controller + DTO + security | integration (MockMvc, real database) | Every route: happy + every listed edge case + error path (400/401/403/404/409/503) | `backend/src/test/java/com/corsinotones/controller/*Test.java`, `config/*Test.java` | `cd backend && ./mvnw -q clean test` |
| Architecture | unit | ARQ-01 to ARQ-03 over every class in `src/main/java` | `backend/src/test/java/com/corsinotones/ArquiteturaTest.java` | `cd backend && ./mvnw -q test -Dtest='ArquiteturaTest'` |
| Front end (unchanged pages) | e2e | The 354 existing Playwright tests still pass with Spring on PostgreSQL | `tests/*.spec.js` | `npx playwright test` |
| Config files / docs | none | build gate only (DB-10 file checks are a unit test) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Docker must be running (`sudo service docker start`). In this WSL shell Node needs `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` first. There is no linter or formatter configured in the repo.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After service-only tasks | `cd backend && ./mvnw -q test -Dtest='*ServiceTest'` |
| Full | After tasks touching migrations, adapters, controllers, security or config | `cd backend && ./mvnw -q clean test` |
| Build | After each phase and for the last task | `cd backend && ./mvnw -q clean test && cd .. && docker compose up -d && CORSINO_DB_PASSWORD=<from .env> npx playwright test` |

---

## Execution Plan

Phases run in order; tasks within a phase run in order.

### Phase 1: Database foundation

```
T1 → T2 → T3 → T4
```

### Phase 2: Users in the database

```
T5 → T6 → T7
```

### Phase 3: Errors and access control

```
T8 → T9
```

### Phase 4: Equipments and packs

```
T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 5: Presets and orders

```
T16 → T17 → T18 → T19 → T20 → T21
```

### Phase 6: Integration and delivery

```
T22 → T23 → T24 → T25 → T26 → T27
```

---

## Task Breakdown

### T1: Wire PostgreSQL, JPA and Flyway with a test container

**What**: Add the persistence dependencies, the `CORSINO_DB_*` datasource properties, `BancoConfig` (fails startup on a blank password), and the `BancoDeTeste` / `BancoIsolado` test configurations imported by every existing `@SpringBootTest`.
**Where**: `backend/pom.xml`
**Depends on**: None
**Reuses**: `config/JwtConfig.java` startup-check pattern; surefire `environmentVariables` block
**Requirement**: DB-08, DB-09

**Tools**:

- MCP: `context7` (Spring Boot 4 Testcontainers, Flyway starter)
- Skill: NONE

**Done when**:

- [x] `pom.xml` has `spring-boot-starter-data-jpa`, `spring-boot-starter-flyway`, `flyway-database-postgresql`, `postgresql`, `spring-boot-starter-security-oauth2-resource-server`, and test `spring-boot-testcontainers`, `testcontainers-postgresql`, `testcontainers-junit-jupiter`
- [x] `application.properties` sets the datasource from `CORSINO_DB_*`, `ddl-auto=validate`, `open-in-view=false`
- [x] `BancoConfigTest`: blank password fails startup with a message naming `CORSINO_DB_PASSWORD` and the JDBC URL; unreachable host fails startup with a message containing the JDBC URL (DB-09)
- [x] A test asserts `spring.jpa.hibernate.ddl-auto` is `validate` (DB-08)
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`
- [x] Test count: 76 existing + new tests pass (no silent deletions)

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `build(backend): wire PostgreSQL, JPA and Flyway with a Testcontainers database`

---

### T2: Create the schema migration

**What**: Write `V1__criar_tabelas.sql` with the six tables, named keys, checks and foreign-key indexes of the design.
**Where**: `backend/src/main/resources/db/migration/V1__criar_tabelas.sql`
**Depends on**: T1
**Reuses**: Data model of `design.md`
**Requirement**: DB-01, DB-02, DB-03, DB-07, PRS-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `MigracoesTest` (Flyway API on its own container) asserts the six tables, each foreign key of DB-02 by name and target, each unique and check constraint of DB-03, and `preset.arquivo_chave` nullable
- [x] Inserting a negative `preco_centavos` and a duplicate `usuario.email` each fails (DB-03 behaviour, not only metadata)
- [x] Running `migrate()` a second time applies 0 migrations (DB-07)
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): add the V1 schema migration`

---

### T3: Load the mock catalogue by migration

**What**: Write `V2__catalogo_inicial.sql` inserting the 4 equipments, 9 packs and 21 presets of `mock/db.seed.json` and restarting the identities.
**Where**: `backend/src/main/resources/db/migration/V2__catalogo_inicial.sql`
**Depends on**: T2
**Reuses**: `mock/db.seed.json`
**Requirement**: DB-01, DB-04, DB-05, DB-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `MigracoesCatalogoTest` reads `mock/db.seed.json` and asserts every pack and preset field equals the database row (per-item values, lesson L-014), counts 4/9/21, and `flyway_schema_history` has V1 and V2
- [x] Inserting a preset after V2 gets id 22 (DB-05); a second `migrate()` keeps 9 packs (DB-07)
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(db): seed the catalogue through the V2 migration`

---

### T4: Add the development database compose file

**What**: Add `docker-compose.yml` (`postgres:16`, published `5433:5432`, password from `.env`), `.env.example`, and `.env` in `.gitignore`.
**Where**: `docker-compose.yml`
**Depends on**: T3
**Reuses**: NONE
**Requirement**: DB-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `ArquivosDeAmbienteTest` asserts the compose service image `postgres:16`, port `5433:5432`, `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` reference, `.env.example` present without a real secret, and `.env` listed in `.gitignore`
- [x] `docker compose up -d` starts the database and the app starts against it with `CORSINO_DB_PASSWORD` from `.env` (manual check, output pasted in the commit body)
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: unit
**Gate**: full

**Commit**: `chore: add a docker-compose PostgreSQL for development`

---

### T5: Add the user profile to the model and the token

**What**: Add `Perfil` and the `perfil` component to `Usuario`, and the `perfil` claim to the token.
**Where**: `backend/src/main/java/com/corsinotones/service/TokenService.java`
**Depends on**: None (runs after Phase 1)
**Reuses**: `model/Usuario.java`, `TokenServiceTest`
**Requirement**: USR-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `TokenServiceTest` asserts the claim `perfil` is `ADMIN` for an admin user and `COMUM` for a common one
- [x] Existing tests compile with the new record component
- [x] Gate check passes: `cd backend && ./mvnw -q test -Dtest='*ServiceTest'`

**Status**: ✅ Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(auth): carry the user profile in the token`

---

### T6: Store users in PostgreSQL

**What**: Add `UsuarioEntidade`, `UsuarioJpa`, `UsuarioRepositoryJpa` and `TradutorDeErros`; move `UsuarioRepositoryEmMemoria` (and its test) to `src/test` as a fake.
**Where**: `backend/src/main/java/com/corsinotones/repository/jpa/UsuarioRepositoryJpa.java`
**Depends on**: T5
**Reuses**: `repository/UsuarioRepository.java`
**Requirement**: USR-01, USR-02, USR-03, USR-07, USR-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Every existing auth controller test passes against PostgreSQL (USR-01); CAD-11 tests are rewritten to USR-02 on `BancoIsolado` (ids 2 then 3)
- [x] A registered user's row has `perfil = 'COMUM'` (USR-03)
- [x] Two concurrent registrations of one e-mail give exactly one `201` and one `409` "Este e-mail já está cadastrado." even when the pre-check is bypassed (USR-07)
- [x] The application context has exactly one `UsuarioRepository` bean, of type `UsuarioRepositoryJpa` (USR-08); `AuthService.java` has no diff
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(users): store users in PostgreSQL`

---

### T7: Seed users only into an empty table, with admins

**What**: Make `SementeUsuarios` skip a non-empty table and give `ADMIN` to the e-mails in `corsino.seed.admins`.
**Where**: `backend/src/main/java/com/corsinotones/repository/SementeUsuarios.java`
**Depends on**: T6
**Reuses**: existing seed tests
**Requirement**: USR-04, USR-05, USR-01 (SEED-01 to SEED-04)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Seed tests run on `BancoIsolado`; `ryan@exemplo.com` is `ADMIN` with the default property and `COMUM` when the property lists another e-mail (USR-04)
- [x] Starting a second context on a database that already has users inserts nothing and keeps the existing hash (USR-05)
- [x] SEED-01 to SEED-04 tests still pass
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(users): seed an empty user table and grant the configured admins`

---

### T8: Map the new domain and database errors

**What**: Add `NaoEncontrado`, `Conflito` and `CampoInvalido` (with `EmailEmUso` as a `Conflito`) and teach `ErroHandler` 404, 409, 400 with a field, 400 "Identificador inválido." and 503.
**Where**: `backend/src/main/java/com/corsinotones/controller/ErroHandler.java`
**Depends on**: None (runs after Phase 2)
**Reuses**: `controller/ControladorDeTeste.java` test routes, `ErroHandlerTest`
**Requirement**: ERR-06, ERR-07, ERR-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `ErroHandlerTest` covers each new exception through a test route with the exact status, `mensagem` and `campos`
- [x] With a `BancoIsolado` container stopped, a test route that reads users answers `503` "Serviço temporariamente indisponível. Tente novamente." and the body has no `SQL`, `jdbc` or `Exception` text (ERR-06)
- [x] `GET /teste/item/abc` with a `long` path variable answers `400` "Identificador inválido." (ERR-07)
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(api): answer not-found, conflict, bad-id and database-down errors`

---

### T9: Protect routes with the resource server

**What**: Turn on `oauth2ResourceServer` with the `perfil` → role converter, the route rules, JSON 401/403 handlers and the wider CORS.
**Where**: `backend/src/main/java/com/corsinotones/config/SegurancaConfig.java`
**Depends on**: T8
**Reuses**: `JwtConfig.jwtDecoder()`, `SegurancaConfigTest`
**Requirement**: ERR-01, ERR-02, ERR-03, ERR-09

**Tools**:

- MCP: `context7` (Spring Security resource server JWT authorities)
- Skill: NONE

**Done when**:

- [x] `DELETE /packs/x` without a token, with a malformed token and with an expired token each answer `401` "Faça login para continuar." (ERR-02)
- [x] The same call with a `COMUM` token answers `403` "Acesso restrito ao administrador." (ERR-03); with an `ADMIN` token it passes security (`404` until T15)
- [x] `GET /packs` without a token and with a valid `COMUM` token does not answer `401`/`403` (ERR-01); `/auth/*` still public
- [x] Preflight from `http://localhost:5173` for `PUT` with `Authorization` is allowed; from `http://evil.example` it is not (ERR-09); SRV-04 tests still pass
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(security): require a token for orders and the admin profile for catalogue writes`

---

### T10: Store equipments

**What**: Add the `Equipamento` record, `EquipamentoRepository`, its entity and JPA adapter.
**Where**: `backend/src/main/java/com/corsinotones/repository/jpa/EquipamentoRepositoryJpa.java`
**Depends on**: None (runs after Phase 3)
**Reuses**: `TradutorDeErros` (T6)
**Requirement**: EQP-01, EQP-07, EQP-08, ERR-04, ERR-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Adapter test: `listar` ordered by marca then modelo; `criar` of an existing pair throws `Duplicado("uk_equipamento_marca_modelo")`; `excluir` of an equipment with packs throws `EmUso("fk_pack_equipamento")`; `temPacks` true for a seeded equipment
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(equipments): store equipments in PostgreSQL`

---

### T11: Equipment rules

**What**: Add `EquipamentoService` (normalisation, duplicate and delete checks, not-found).
**Where**: `backend/src/main/java/com/corsinotones/service/EquipamentoService.java`
**Depends on**: T10
**Reuses**: in-memory fake pattern of `UsuarioRepositoryEmMemoria`
**Requirement**: EQP-03, EQP-04, EQP-05, EQP-07, EQP-08, EQP-09, ERR-04, ERR-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Unit tests with a fake: `"  BOSS "` stored as `boss`; duplicate pair (pre-check and fake throwing `Duplicado`) → `Conflito` "Este equipamento já está cadastrado."; delete with packs (pre-check and `EmUso`) → `Conflito` "Este equipamento tem packs e não pode ser excluído."; unknown id → `NaoEncontrado` "Equipamento não encontrado."; `PUT` to its own pair is not a duplicate
- [x] Gate check passes: `cd backend && ./mvnw -q test -Dtest='*ServiceTest'`

**Status**: ✅ Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(equipments): add the equipment rules`

---

### T12: Equipment endpoints

**What**: Add `EquipamentoController` and its request/response records.
**Where**: `backend/src/main/java/com/corsinotones/controller/EquipamentoController.java`
**Depends on**: T11
**Reuses**: `AuthControllerCadastroTest` MockMvc style
**Requirement**: EQP-01 to EQP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] MockMvc tests on PostgreSQL: each EQP criterion with its exact status and message; boundary 50/51 characters for `marca` and `modelo`; both fields invalid listed together
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(equipments): expose the equipment CRUD endpoints`

---

### T13: Store packs

**What**: Add the `Pack` record, `PackRepository`, its entity and adapter (fetch join on equipment).
**Where**: `backend/src/main/java/com/corsinotones/repository/jpa/PackRepositoryJpa.java`
**Depends on**: T12
**Reuses**: `EquipamentoEntidade` (T10)
**Requirement**: PCK-01, PCK-02, PCK-11, PCK-12, ERR-04, ERR-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Adapter test: `buscar("rock-boss-gt-1000")` returns the seeded values with its equipment; `listar` ordered by id; `buscarVarios` returns only existing ids; duplicate style per equipment → `Duplicado("uk_pack_estilo_equipamento")`; delete of a pack with presets → `EmUso("fk_preset_pack")`
- [x] Listing 9 packs issues one SQL query (Hibernate statistics), not 1 + N
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(packs): store packs in PostgreSQL`

---

### T14: Pack rules and slug

**What**: Add `PackService` with the slug, validation of the equipment reference, duplicates, delete guard and not-found.
**Where**: `backend/src/main/java/com/corsinotones/service/PackService.java`
**Depends on**: T13
**Reuses**: fakes from T11
**Requirement**: PCK-03, PCK-04, PCK-05, PCK-10, PCK-11, PCK-12, PCK-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Slug tests: `clean`/`line6`/`HX Stomp` → `clean-line6-hx-stomp`; `clássico` → `classico`; `"  Rock!! "` → no leading/trailing `-`; a rejection sample with a valid slug embedded in invalid text (lesson L-002)
- [x] `PUT` keeps the id when `estilo` changes; unknown `equipamentoId` → `CampoInvalido("equipamentoId", "Equipamento não encontrado.")`; duplicate and delete guards with their exact messages
- [x] Gate check passes: `cd backend && ./mvnw -q test -Dtest='*ServiceTest'`

**Status**: ✅ Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(packs): add the pack rules and id slug`

---

### T15: Pack endpoints

**What**: Add `PackController` and its records (`BigDecimal` price with `@Digits`).
**Where**: `backend/src/main/java/com/corsinotones/controller/PackController.java`
**Depends on**: T14
**Reuses**: T12 test style
**Requirement**: PCK-01 to PCK-13, ERR-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] MockMvc tests: each PCK criterion with exact status and message; price 0 and 1000000 accepted, -1, 1000001 and 49.5 rejected; `"precoCentavos": "abc"` → ERR-08 body; nome 2/120 and 1/121, estilo 2/30 and 1/31, descricao 500/501 boundaries
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(packs): expose the pack CRUD endpoints`

---

### T16: Store presets

**What**: Add the `Preset` record, `PresetRepository`, its entity and adapter (fetch join pack and equipment, order by date desc then id).
**Where**: `backend/src/main/java/com/corsinotones/repository/jpa/PresetRepositoryJpa.java`
**Depends on**: None (runs after Phase 4)
**Reuses**: `PackEntidade` (T13)
**Requirement**: PRS-01, PRS-02, PRS-03, PRS-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Adapter test: `buscar(1)` equals the seed; `listarPorPack("metal-nux-mg-30")` returns exactly the seed's ids for that pack; unknown pack → empty; order by `data` desc then `id` asc, with fixture dates that differ per item (lesson L-014)
- [x] `arquivo_chave` stays NULL after `criar` and `atualizar`
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(presets): store presets in PostgreSQL`

---

### T17: Preset rules

**What**: Add `PresetService` with pack reference check and not-found.
**Where**: `backend/src/main/java/com/corsinotones/service/PresetService.java`
**Depends on**: T16
**Reuses**: fakes from T14
**Requirement**: PRS-04, PRS-05, PRS-06, PRS-10, PRS-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Unit tests: unknown `packId` → `CampoInvalido("packId", "Pack não encontrado.")`; `PUT` moves the preset to another pack; unknown id → `NaoEncontrado` "Preset não encontrado."
- [x] Gate check passes: `cd backend && ./mvnw -q test -Dtest='*ServiceTest'`

**Status**: ✅ Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(presets): add the preset rules`

---

### T18: Preset endpoints

**What**: Add `PresetController`, its records and the `@DataIso` constraint.
**Where**: `backend/src/main/java/com/corsinotones/controller/PresetController.java`
**Depends on**: T17
**Reuses**: T15 test style
**Requirement**: PRS-01 to PRS-12, ERR-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] MockMvc tests: each PRS criterion with exact status and message; `2026-02-30`, `2026-2-3` and `25/06/2026` rejected; `GET /presets/abc` → 400 "Identificador inválido."; no response contains `arquivoChave` and a body with `arquivoChave` does not set the column (PRS-12)
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(presets): expose the preset CRUD endpoints`

---

### T19: Store orders

**What**: Add `Pedido`, `ItemPedido`, `StatusPedido`, `PedidoRepository`, its entities and adapter.
**Where**: `backend/src/main/java/com/corsinotones/repository/jpa/PedidoRepositoryJpa.java`
**Depends on**: T18
**Reuses**: `PackEntidade`, `UsuarioEntidade`
**Requirement**: PED-02, PED-04, PED-05, PED-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Adapter test: `criar` stores the order and its items with their prices; `listarDoUsuario` returns only that user's orders, newest first, filtered by status; `buscarDoUsuario` of another user's order is empty; status stored as `pago`
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(orders): store orders and their items in PostgreSQL`

---

### T20: Order rules

**What**: Add `PedidoService` (`@Transactional` create with server-side total, list, find).
**Where**: `backend/src/main/java/com/corsinotones/service/PedidoService.java`
**Depends on**: T19
**Reuses**: `Clock` bean from `JwtConfig`, fakes
**Requirement**: PED-01, PED-02, PED-03, PED-07, PED-08, PED-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Unit tests: total equals the sum of the fake packs' prices (packs with different prices, lesson L-014); status `PAGO`; `criadoEm` from a fixed `Clock`; empty list, repeated id and the first unknown id in request order each give their exact `CampoInvalido`; nothing stored on error
- [x] Gate check passes: `cd backend && ./mvnw -q test -Dtest='*ServiceTest'`

**Status**: ✅ Done

**Tests**: unit
**Gate**: quick

**Commit**: `feat(orders): add the order rules`

---

### T21: Order endpoints

**What**: Add `PedidoController` and its records; the user comes from the token.
**Where**: `backend/src/main/java/com/corsinotones/controller/PedidoController.java`
**Depends on**: T20
**Reuses**: token helpers from T9 tests
**Requirement**: PED-01 to PED-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] MockMvc tests: each PED criterion; a body with another `usuarioId`, `totalCentavos: 1` and `status: "pendente"` is ignored (PED-03); a later pack price change leaves the order total and items unchanged (PED-02)
- [x] PED-10 on `BancoIsolado`: a test-only trigger that raises on `item_pedido` insert for one pack makes `POST /pedidos` answer `500` and leaves no `pedido` row for that user
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `feat(orders): expose order creation and listing`

---

### T22: Check the layer rules

**What**: Add `ArquiteturaTest`, which scans `src/main/java` imports and annotations.
**Where**: `backend/src/test/java/com/corsinotones/ArquiteturaTest.java`
**Depends on**: None (runs after Phase 5)
**Reuses**: SRV-03 test idea at `AuthControllerCadastroTest.java:141`
**Requirement**: ARQ-01, ARQ-02, ARQ-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Fails if any `controller` or `service` file imports `jakarta.persistence`, `org.springframework.data` or `org.hibernate` (ARQ-01), if a controller method returns an `@Entity` type (ARQ-02), or if a service constructor takes a Spring Data type (ARQ-03); a planted bad import in a temp copy makes it fail
- [x] Gate check passes: `cd backend && ./mvnw -q test -Dtest='ArquiteturaTest'`

**Status**: ✅ Done

**Tests**: unit
**Gate**: quick

**Commit**: `test(backend): enforce that only the repository layer knows the database`

---

### T23: Prove data survives a restart

**What**: Add `PersistenciaAposReinicioTest`: start the app, create an equipment and register a user over HTTP, stop it, start it again on the same container, read both.
**Where**: `backend/src/test/java/com/corsinotones/PersistenciaAposReinicioTest.java`
**Depends on**: T22
**Reuses**: `BancoIsolado`
**Requirement**: DB-06, DB-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] After the restart `GET /equipamentos/{id}` returns the same body and the user signs in; the catalogue still has 9 seeded packs
- [x] Gate check passes: `cd backend && ./mvnw -q clean test`

**Status**: ✅ Done

**Tests**: integration
**Gate**: full

**Commit**: `test(backend): prove data survives an application restart`

---

### T24: Run Playwright against Spring on PostgreSQL

**What**: Pass `CORSINO_DB_PASSWORD` to the Spring web server in `playwright.config.js` and run the full suite.
**Where**: `playwright.config.js`
**Depends on**: T23
**Reuses**: existing web server block
**Requirement**: USR-01 (success criterion: 354 Playwright tests)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] With `docker compose up -d` and `CORSINO_DB_PASSWORD` exported, `npx playwright test` passes 354 tests
- [x] Gate check passes: build gate

**Status**: ✅ Done

**Tests**: e2e
**Gate**: build

**Commit**: `test(frontend): start Spring with the database password in Playwright`

---

### T25: Write the stage 07 delivery document

**What**: Write `docs/etapa-07.md` with the ER diagram, entities, relationships, creation steps, curl CRUD examples with real responses and the PostgreSQL rationale.
**Where**: `docs/etapa-07.md`
**Depends on**: T24
**Reuses**: `docs/etapa-05.md` structure, `design.md` diagram
**Requirement**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Every curl example was run against `docker compose up -d` and its pasted response matches
- [x] Gate check passes: build gate

**Status**: ✅ Done

**Tests**: none
**Gate**: build

**Commit**: `docs: describe the stage 07 database`

---

### T26: Update the README for the database

**What**: State stage 07, the Docker/PostgreSQL prerequisite, the `CORSINO_DB_*` variables and the new start order.
**Where**: `README.md`
**Depends on**: T25
**Reuses**: section "Como executar"
**Requirement**: DOC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Following the README on a clean checkout starts the database, the API and the front end
- [x] Gate check passes: build gate

**Status**: ✅ Done

**Tests**: none
**Gate**: build

**Commit**: `docs: explain how to run the API with PostgreSQL`

---

### T27: Align the proposal with the data model

**What**: Replace the parameter, comment and favourite entities in `docs/proposta.md` with the six tables and the MinIO note.
**Where**: `docs/proposta.md`
**Depends on**: T26
**Reuses**: NONE
**Requirement**: DOC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `grep -i "parâmetro" docs/proposta.md` finds nothing; the six entities and MinIO are listed
- [x] Gate check passes: build gate

**Status**: ✅ Done

**Tests**: none
**Gate**: build

**Commit**: `docs: align the proposal with the stage 07 data model`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7
Phase 3:  T8 → T9
Phase 4:  T10 → T11 → T12 → T13 → T14 → T15
Phase 5:  T16 → T17 → T18 → T19 → T20 → T21
Phase 6:  T22 → T23 → T24 → T25 → T26 → T27
```

Batches (~7 tasks, whole phases): Batch A = Phases 1-2 (T1-T7), Batch B = Phases 3-4 (T8-T15, 8 tasks), Batch C = Phase 5 (T16-T21), Batch D = Phase 6 (T22-T27).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | Build + datasource config + test wiring (one compile-time unit: JPA on the classpath breaks every context without the test database) | ⚠️ Cohesive, cannot split |
| T2, T3 | 1 migration each | ✅ |
| T4 | Compose + env example + ignore line | ⚠️ Cohesive |
| T5 | 1 record component + 1 claim | ✅ |
| T6 | 1 adapter (entity + Spring Data + adapter + translator) and the fake move | ⚠️ Cohesive (one repository) |
| T7 | 1 class | ✅ |
| T8 | 3 exceptions + 1 handler | ⚠️ Cohesive |
| T9 | 1 config class | ✅ |
| T10, T13, T16, T19 | 1 adapter each | ✅ |
| T11, T14, T17, T20 | 1 service each | ✅ |
| T12, T15, T18, T21 | 1 controller + its DTO records each | ✅ |
| T22, T23 | 1 test class each | ✅ |
| T24-T27 | 1 file each | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | start of Phase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | None (after Phase 1) | first task of Phase 2 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | None (after Phase 2) | first task of Phase 3 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | None (after Phase 3) | first task of Phase 4 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | None (after Phase 4) | first task of Phase 5 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | None (after Phase 5) | first task of Phase 6 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |
| T25 | T24 | T24 → T25 | ✅ |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T26 | T26 → T27 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Config + test infra | integration (config startup behaviour) | integration | ✅ |
| T2, T3 | Migrations | integration | integration | ✅ |
| T4 | Config files | none (+ unit file check) | unit | ✅ |
| T5 | Service (`TokenService`) | unit | unit | ✅ |
| T6, T7 | Repository adapters / seeder | integration | integration | ✅ |
| T8, T9 | Controller advice / security | integration | integration | ✅ |
| T10, T13, T16, T19 | Repository adapters | integration | integration | ✅ |
| T11, T14, T17, T20 | Service | unit | unit | ✅ |
| T12, T15, T18, T21 | Controller + DTO | integration | integration | ✅ |
| T22 | Architecture | unit | unit | ✅ |
| T23 | Cross-layer | integration | integration | ✅ |
| T24 | Front end config | e2e | e2e | ✅ |
| T25-T27 | Docs | none | none | ✅ |
