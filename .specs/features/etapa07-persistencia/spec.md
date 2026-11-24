# PostgreSQL Persistence and CRUD (Stage 07) - Specification

Stage 07 of the course ("Persistência e CRUD com banco de dados"): replace the temporary data of the API with real persistence. Builds on `etapa06-spring-cadastro` (AD-010, AD-011). Decisions taken with the user are in `context.md`.

## Problem Statement

The Spring API keeps users in memory (`UsuarioRepositoryEmMemoria`), so every restart loses them, and the catalogue (equipments, packs, presets) and the orders still live only in the json-server mock. Stage 07 requires a database with related entities, full CRUD, data that survives restarts, validation, handled persistence errors and an API decoupled from the database.

This feature moves users, equipments, packs, presets and orders to PostgreSQL through Spring Data JPA, with the schema versioned by Flyway, and exposes CRUD endpoints for them. Preset files will live in MinIO in a later slice; here a preset only reserves the column that will hold the object key.

## Goals

- [ ] Six tables (`usuario`, `equipamento`, `pack`, `preset`, `pedido`, `item_pedido`) created by Flyway migrations, with the mock catalogue loaded by a migration.
- [ ] Full CRUD over HTTP for equipments, packs and presets (writes restricted to the administrator), plus creating and reading orders.
- [ ] Data written through the API is still there after the application restarts.
- [ ] Controllers and services never touch JPA types; only `repository` and `model` know about the database.
- [ ] `docs/etapa-07.md` delivers the database model, entities, relationships, creation instructions, CRUD examples and the reason for choosing PostgreSQL.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| MinIO, uploading preset files, download endpoint and pre-signed URLs | User: next slice; this one only reserves `preset.arquivo_chave` |
| Docker image of the app and deploy compose (app + PostgreSQL + MinIO) | User: deploy comes later; only a development `docker-compose.yml` with PostgreSQL is in scope |
| Parameters, comments and favourites from `docs/proposta.md` | User dropped parameters; comments and favourites are not used by the current front end |
| Switching the legacy front end from json-server to Spring for catalogue and orders | Later slice (AD-012 moves one resource at a time); the JSON field names are kept so it becomes a base-URL change |
| Updating or deleting orders, order status transitions | Orders are purchase history; payment is simulated in the browser |
| Pagination, text search and sorting on the server | The catalogue has 9 packs and 21 presets; the front end filters locally |
| Migrating the 224 orders and 17 users of `mock/db.json` | They are test leftovers; the seed `mock/db.seed.json` has no orders |
| Refresh tokens, logout, rate limiting | Unchanged from `etapa06-spring-cadastro` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Database | PostgreSQL 16 | User choice; relational data with foreign keys (AD-010, `docs/proposta.md`) | y |
| Slice size | PostgreSQL only; MinIO and download in the next slice | User choice | y |
| Write permissions | `usuario.perfil` is `COMUM` or `ADMIN`; catalogue `GET` routes are public; catalogue `POST`/`PUT`/`DELETE` require `ADMIN`; order routes require any signed-in user | User choice; matches `docs/proposta.md` | y |
| Initial catalogue | Flyway migration `V2` inserts the 4 equipments, 9 packs and 21 presets of `mock/db.seed.json`, keeping pack ids (slugs) and preset ids 1 to 21 | User choice; versioned SQL doubles as creation instructions | y |
| Backend test database | Testcontainers starts a PostgreSQL 16 container for `./mvnw test`; the Docker daemon must be running | User choice; tests run on the same engine as production | y |
| New dependencies | `spring-boot-starter-data-jpa`, `spring-boot-starter-flyway`, `org.flywaydb:flyway-database-postgresql`, `org.postgresql:postgresql`, `spring-boot-starter-security-oauth2-resource-server`; test: `spring-boot-testcontainers`, `org.testcontainers:testcontainers-postgresql`, `org.testcontainers:testcontainers-junit-jupiter` | Implied by the choices above; the resource-server starter was approved at Design | y |
| Schema management | Flyway owns the schema; Hibernate runs with `ddl-auto=validate` and never creates or alters tables | Schema history in git (`docs/proposta.md`); `update` changes the database unpredictably | n |
| Connection settings | `CORSINO_DB_URL` (default `jdbc:postgresql://localhost:5433/corsinotones`), `CORSINO_DB_USER` (default `corsino`), `CORSINO_DB_PASSWORD` (no default) | Same pattern as `CORSINO_JWT_SECRET`; secrets never in git (AD-011) | n |
| Development database | `docker-compose.yml` at the repo root with one `postgres:16` service published on host port 5433 (`5433:5432`), reading `POSTGRES_PASSWORD` from a git-ignored `.env`; `.env.example` is committed | Dev only; deploy compose is out of scope. Host port 5433 because a local PostgreSQL 16 cluster may hold 5432 | y |
| Who is admin | `POST /auth/cadastro` always creates `COMUM`. The user seeder creates `ADMIN` for the e-mails in `corsino.seed.admins` (default `ryan@exemplo.com`) | The seed file stays read-only (`etapa06` SEED-04) and the API never lets a visitor promote itself | n |
| User seeding | WHEN the app starts and the `usuario` table is empty THEN the seeder loads `mock/db.seed.json` as in `etapa06` (SEED-01 to SEED-03); WHEN the table has rows it loads nothing | Keeps the 354 Playwright tests' known user (`ryan@exemplo.com` / `teste123`) and never duplicates rows | n |
| Id of a new user | Database identity (`BIGSERIAL`), replacing "largest id plus 1" (CAD-11) | The database generates ids safely under concurrency; seed id 1 is kept, so the first new user still gets 2 | n |
| Equipment | `{id, marca, modelo}`; `marca` trimmed and lower-cased, as in the mock (`boss`); `(marca, modelo)` unique | The mock stores brands lower-cased | n |
| Pack id | The server builds the id at creation as the slug of `estilo`, `marca` and `modelo` (`rock-boss-gt-1000`); the id never changes; `(estilo, equipamento_id)` unique | Same ids as the mock, which the front end puts in URLs; README: one pack per style per equipment | n |
| Pack `estilo` | Trimmed, lower-cased, 2 to 30 characters; free text | The seed has `blues`, `clean`, `metal`, `rock`; a fixed list would block new styles | n |
| Preset style, brand and model | Not stored on `preset`; read through its pack and equipment | The seed is consistent (checked: 0 of 21 presets differ from their pack), so storing them would only duplicate data | n |
| `preset.arquivo_chave` | Nullable `VARCHAR(255)` column; NULL for every preset in this slice; not part of any JSON | Reserved for the MinIO slice; the key is not public data | n |
| Money | Integer cents (`preco_centavos`, `total_centavos`), as in the mock | Avoids floating point; the front end already formats cents | n |
| JSON field names | Same as the mock: pack `{id, nome, estilo, marca, equipamento, equipamentoId, descricao, precoCentavos}`; preset `{id, nome, estilo, marca, equipamento, data, descricao, packId}`; order `{id, usuarioId, packIds, totalCentavos, status, criadoEm}` | The front end migrates by changing only the base URL (AD-012); `equipamento` is the model name | n |
| Order creation | Body `{packIds}`. The server takes the user from the token, computes the total from the database prices, stores `status` `"pago"` and ignores any other field sent | Payment is simulated in the browser today; the client must not set its own price, owner or status | n |
| Order statuses | `"pendente"` or `"pago"`, lower-case as in the mock; new orders are always `"pago"` | `GET /pedidos?status=pago` is what the library page calls | n |
| Buying a pack already owned | Allowed; no check | Not in the stage requirements; the library dedupes packs | n |
| Deleting a parent | Deleting an equipment with packs, or a pack with presets or orders, answers `409` and deletes nothing; deleting a preset always works | Keeps purchase history and avoids silent cascades over the catalogue | n |
| Error body and messages | Same body as `etapa06` (`status`, `mensagem`, `campos`); messages in Portuguese as listed in the criteria | Consistent errors (stage 06 requirement) | n |
| Delivery document | `docs/etapa-07.md` with a Mermaid ER diagram, plus a README section on starting the database | Same place as `docs/etapa-03.md` to `etapa-05.md`; GitHub renders Mermaid | n |
| `docs/proposta.md` | Updated to drop the Parameter entity and describe the six tables and MinIO | It contradicts the model after the user dropped parameters | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: The database exists and survives restarts ⭐ MVP

**User Story**: As the developer, I want the API to store its data in PostgreSQL with a versioned schema, so that nothing is lost on restart and the database can be recreated from the repository.

**Why P1**: Every other story writes to these tables; requirements 1 and 4 of the stage.

**Acceptance Criteria**:

1. WHEN the app starts against an empty database THEN Flyway SHALL create the tables `usuario`, `equipamento`, `pack`, `preset`, `pedido` and `item_pedido` and record migrations `V1` (schema) and `V2` (initial catalogue).  <!-- DB-01 -->
2. The schema SHALL declare the foreign keys `pack.equipamento_id → equipamento.id`, `preset.pack_id → pack.id`, `pedido.usuario_id → usuario.id`, `item_pedido.pedido_id → pedido.id` and `item_pedido.pack_id → pack.id`.  <!-- DB-02 -->
3. The schema SHALL declare the unique constraints `usuario(email)`, `equipamento(marca, modelo)`, `pack(estilo, equipamento_id)` and `item_pedido(pedido_id, pack_id)`, and the checks `preco_centavos >= 0` on `pack` and `item_pedido`.  <!-- DB-03 -->
4. WHEN migration `V2` has run THEN the database SHALL hold 4 equipments, 9 packs and 21 presets whose values equal those of `mock/db.seed.json`, with the same pack ids and preset ids 1 to 21.  <!-- DB-04 -->
5. WHEN a preset is created after `V2` THEN its id SHALL be 22.  <!-- DB-05 -->
6. WHEN a resource is created through the API and the application is stopped and started again against the same database THEN a `GET` of that resource SHALL return it unchanged.  <!-- DB-06 -->
7. WHEN the app starts again against a database that already has the migrations THEN Flyway SHALL apply nothing and the catalogue SHALL NOT be duplicated.  <!-- DB-07 -->
8. Hibernate SHALL run with `spring.jpa.hibernate.ddl-auto=validate`.  <!-- DB-08 -->
9. IF `CORSINO_DB_PASSWORD` is missing or the database is unreachable at startup THEN the app SHALL fail to start with a message naming the database connection.  <!-- DB-09 -->
10. The repository SHALL contain `docker-compose.yml` with a `postgres:16` service published as `5433:5432` that reads its password from `.env`, plus a committed `.env.example`, and `.env` SHALL be listed in `.gitignore`.  <!-- DB-10 -->

**Independent Test**: `docker compose up -d`, start the app, `psql` lists six tables and `flyway_schema_history` has two rows; create an equipment, restart the app, `GET` it.

---

### P1: Users live in the database ⭐ MVP

**User Story**: As a visitor, I want my account to survive a server restart, so that I can sign in tomorrow.

**Why P1**: Replaces the in-memory store that stage 07 forbids; the existing auth contract must keep working.

**Acceptance Criteria**:

1. Every acceptance criterion of `etapa06-spring-cadastro` (SRV, CAD, LOG, SEED) SHALL still pass against PostgreSQL, except CAD-11, which USR-02 replaces.  <!-- USR-01 -->
2. WHEN a user is created through `POST /auth/cadastro` on a database seeded with the default seed THEN its id SHALL be 2, and the next one 3.  <!-- USR-02 -->
3. WHEN a user is created through `POST /auth/cadastro` THEN its `perfil` SHALL be `COMUM`.  <!-- USR-03 -->
4. WHEN the seeder loads an e-mail listed in `corsino.seed.admins` THEN that user's `perfil` SHALL be `ADMIN`; every other seeded user SHALL be `COMUM`.  <!-- USR-04 -->
5. WHEN the app starts and the `usuario` table already has rows THEN the seeder SHALL insert nothing.  <!-- USR-05 -->
6. The token issued by `POST /auth/login` SHALL carry a `perfil` claim equal to the user's profile.  <!-- USR-06 -->
7. IF two registrations with the same e-mail arrive at the same time THEN the database unique constraint SHALL make exactly one answer `201` and the other `409` "Este e-mail já está cadastrado."  <!-- USR-07 -->
8. The runtime SHALL NOT use `UsuarioRepositoryEmMemoria`; `UsuarioRepository` SHALL keep its interface so `AuthService` is unchanged.  <!-- USR-08 -->

**Independent Test**: register a user, restart the app, sign in with it; decode the token and read `perfil`.

---

### P1: Equipment CRUD ⭐ MVP

**User Story**: As the administrator, I want to manage the equipment list, so that packs can be attached to a brand and model.

**Why P1**: Simplest full CRUD; packs depend on it.

**Acceptance Criteria**:

1. WHEN `GET /equipamentos` is called THEN the server SHALL answer `200` with every equipment as `{id, marca, modelo}`, ordered by `marca` then `modelo`.  <!-- EQP-01 -->
2. WHEN `GET /equipamentos/{id}` names an existing equipment THEN the server SHALL answer `200` with it.  <!-- EQP-02 -->
3. WHEN an `ADMIN` sends `POST /equipamentos` with a valid `{marca, modelo}` THEN the server SHALL answer `201` with the stored equipment, `marca` trimmed and lower-cased and `modelo` trimmed.  <!-- EQP-03 -->
4. WHEN an `ADMIN` sends `PUT /equipamentos/{id}` with a valid `{marca, modelo}` THEN the server SHALL answer `200` with the updated equipment.  <!-- EQP-04 -->
5. WHEN an `ADMIN` sends `DELETE /equipamentos/{id}` for an equipment without packs THEN the server SHALL answer `204` and a later `GET` of it SHALL answer `404`.  <!-- EQP-05 -->
6. IF `marca` or `modelo`, after trimming, is empty or longer than 50 characters THEN the server SHALL answer `400` with `campos.marca` "Informe a marca com 1 a 50 caracteres." or `campos.modelo` "Informe o modelo com 1 a 50 caracteres.", listing every invalid field.  <!-- EQP-06 -->
7. IF the pair `(marca, modelo)` already exists in another equipment THEN `POST` and `PUT` SHALL answer `409` "Este equipamento já está cadastrado." and change nothing.  <!-- EQP-07 -->
8. IF the equipment has packs THEN `DELETE` SHALL answer `409` "Este equipamento tem packs e não pode ser excluído." and delete nothing.  <!-- EQP-08 -->
9. IF `{id}` names no equipment THEN `GET`, `PUT` and `DELETE` SHALL answer `404` "Equipamento não encontrado."  <!-- EQP-09 -->

**Independent Test**: as admin, `POST` an equipment, `PUT` its model, `GET` it, `DELETE` it, `GET` again for `404`.

---

### P1: Pack CRUD ⭐ MVP

**User Story**: As the administrator, I want to create, edit and remove packs, so that the store catalogue comes from the database.

**Why P1**: Packs are what the store sells; orders reference them.

**Acceptance Criteria**:

1. WHEN `GET /packs` is called THEN the server SHALL answer `200` with every pack as `{id, nome, estilo, marca, equipamento, equipamentoId, descricao, precoCentavos}`, where `marca` and `equipamento` come from its equipment's `marca` and `modelo`, ordered by `id`.  <!-- PCK-01 -->
2. WHEN `GET /packs/rock-boss-gt-1000` is called after `V2` THEN the server SHALL answer `200` with `nome` "Rock · Boss GT-1000", `estilo` "rock", `marca` "boss", `equipamento` "GT-1000" and `precoCentavos` 4990.  <!-- PCK-02 -->
3. WHEN an `ADMIN` sends `POST /packs` with a valid `{nome, estilo, descricao, precoCentavos, equipamentoId}` THEN the server SHALL answer `201` with the pack, whose `id` is the lower-case slug of `estilo`, `marca` and `modelo` joined by `-`, with every run of non-alphanumeric characters replaced by one `-` (style `clean` on `line6` `HX Stomp` gives `clean-line6-hx-stomp`).  <!-- PCK-03 -->
4. WHEN an `ADMIN` sends `PUT /packs/{id}` with a valid body THEN the server SHALL answer `200` with the updated pack and its `id` SHALL stay the same.  <!-- PCK-04 -->
5. WHEN an `ADMIN` sends `DELETE /packs/{id}` for a pack without presets and without orders THEN the server SHALL answer `204`.  <!-- PCK-05 -->
6. IF `nome` has, after trimming, fewer than 2 or more than 120 characters THEN the server SHALL answer `400` with `campos.nome` "Informe um nome com 2 a 120 caracteres."  <!-- PCK-06 -->
7. IF `estilo` has, after trimming, fewer than 2 or more than 30 characters THEN the server SHALL answer `400` with `campos.estilo` "Informe um estilo com 2 a 30 caracteres."  <!-- PCK-07 -->
8. IF `descricao` is missing or has, after trimming, more than 500 characters THEN the server SHALL answer `400` with `campos.descricao` "Informe uma descrição de até 500 caracteres."  <!-- PCK-08 -->
9. IF `precoCentavos` is missing, a number with a fractional part (`49.5`), below 0 or above 1000000 THEN the server SHALL answer `400` with `campos.precoCentavos` "Informe um preço entre 0 e 1000000 centavos."  <!-- PCK-09 -->
10. IF `equipamentoId` is missing or names no equipment THEN the server SHALL answer `400` with `campos.equipamentoId` "Equipamento não encontrado."  <!-- PCK-10 -->
11. IF another pack already has the same `estilo` and equipment THEN `POST` and `PUT` SHALL answer `409` "Já existe um pack deste estilo para este equipamento." and change nothing.  <!-- PCK-11 -->
12. IF the pack has presets or appears in an order THEN `DELETE` SHALL answer `409` "Este pack tem presets ou pedidos e não pode ser excluído." and delete nothing.  <!-- PCK-12 -->
13. IF `{id}` names no pack THEN `GET`, `PUT` and `DELETE` SHALL answer `404` "Pack não encontrado."  <!-- PCK-13 -->

**Independent Test**: as admin, create a `clean` pack for the HX Stomp, edit its price, list packs, delete it.

---

### P1: Preset CRUD ⭐ MVP

**User Story**: As the administrator, I want to manage the presets of each pack, so that the pack page lists what the buyer gets.

**Why P1**: Completes the catalogue; the pack page reads presets by pack.

**Acceptance Criteria**:

1. WHEN `GET /presets` is called THEN the server SHALL answer `200` with every preset as `{id, nome, estilo, marca, equipamento, data, descricao, packId}`, where `estilo`, `marca` and `equipamento` come from its pack and equipment and `data` is `YYYY-MM-DD`, ordered by `data` descending then `id` ascending.  <!-- PRS-01 -->
2. WHEN `GET /presets?packId=metal-nux-mg-30` is called after `V2` THEN the server SHALL answer `200` with only the presets of that pack, and with `[]` for a `packId` that has no presets or does not exist.  <!-- PRS-02 -->
3. WHEN `GET /presets/1` is called after `V2` THEN the server SHALL answer `200` with `nome` "Djent Preciso", `packId` "metal-nux-mg-30", `estilo` "metal", `marca` "nux", `equipamento` "MG-30" and `data` "2026-06-25".  <!-- PRS-03 -->
4. WHEN an `ADMIN` sends `POST /presets` with a valid `{nome, descricao, data, packId}` THEN the server SHALL answer `201` with the preset.  <!-- PRS-04 -->
5. WHEN an `ADMIN` sends `PUT /presets/{id}` with a valid body THEN the server SHALL answer `200` with the updated preset, including a changed `packId`.  <!-- PRS-05 -->
6. WHEN an `ADMIN` sends `DELETE /presets/{id}` THEN the server SHALL answer `204` and a later `GET` of it SHALL answer `404`.  <!-- PRS-06 -->
7. IF `nome` has, after trimming, fewer than 2 or more than 120 characters THEN the server SHALL answer `400` with `campos.nome` "Informe um nome com 2 a 120 caracteres."  <!-- PRS-07 -->
8. IF `descricao` is missing or has, after trimming, more than 500 characters THEN the server SHALL answer `400` with `campos.descricao` "Informe uma descrição de até 500 caracteres."  <!-- PRS-08 -->
9. IF `data` is missing or is not a real calendar date in `YYYY-MM-DD` THEN the server SHALL answer `400` with `campos.data` "Informe a data no formato AAAA-MM-DD."  <!-- PRS-09 -->
10. IF `packId` is missing or names no pack THEN the server SHALL answer `400` with `campos.packId` "Pack não encontrado."  <!-- PRS-10 -->
11. IF `{id}` names no preset THEN `GET`, `PUT` and `DELETE` SHALL answer `404` "Preset não encontrado."  <!-- PRS-11 -->
12. The column `preset.arquivo_chave` SHALL exist, be nullable, and SHALL NOT appear in any request or response.  <!-- PRS-12 -->

**Independent Test**: as admin, create a preset in `rock-boss-gt-1000`, move it to `metal-boss-gt-1000` with `PUT`, filter by pack, delete it.

---

### P1: Orders ⭐ MVP

**User Story**: As a signed-in buyer, I want my purchases stored on the server, so that my library is the same on any device.

**Why P1**: Exercises the `usuario` → `pedido` → `item_pedido` → `pack` relationships and the transaction requirement.

**Acceptance Criteria**:

1. WHEN a signed-in user sends `POST /pedidos` with `{packIds}` naming existing packs THEN the server SHALL answer `201` with `{id, usuarioId, packIds, totalCentavos, status, criadoEm}`, where `usuarioId` is the token's user, `totalCentavos` is the sum of the packs' current prices, `status` is `"pago"` and `criadoEm` is an ISO-8601 instant.  <!-- PED-01 -->
2. WHEN an order is created THEN each `item_pedido` row SHALL store the pack's price at that moment, and a later price change of the pack SHALL NOT change the order's `totalCentavos` or items.  <!-- PED-02 -->
3. The server SHALL ignore `usuarioId`, `totalCentavos`, `status` and `criadoEm` sent in the body.  <!-- PED-03 -->
4. WHEN a signed-in user calls `GET /pedidos` THEN the server SHALL answer `200` with only that user's orders, newest `criadoEm` first, and `GET /pedidos?status=pago` SHALL return only the paid ones.  <!-- PED-04 -->
5. WHEN a signed-in user calls `GET /pedidos/{id}` for one of their orders THEN the server SHALL answer `200` with it.  <!-- PED-05 -->
6. IF `GET /pedidos/{id}` names an order of another user or no order THEN the server SHALL answer `404` "Pedido não encontrado."  <!-- PED-06 -->
7. IF `packIds` is missing or empty THEN the server SHALL answer `400` with `campos.packIds` "Escolha pelo menos um pack."  <!-- PED-07 -->
8. IF `packIds` repeats an id THEN the server SHALL answer `400` with `campos.packIds` "Um pack aparece mais de uma vez."  <!-- PED-08 -->
9. IF any id in `packIds` names no pack THEN the server SHALL answer `400` with `campos.packIds` "Pack não encontrado: <id>." and SHALL store neither the order nor any item.  <!-- PED-09 -->
10. IF storing an item fails after the order row was written THEN the transaction SHALL roll back and no `pedido` or `item_pedido` row of that request SHALL remain.  <!-- PED-10 -->

**Independent Test**: sign in, `POST /pedidos` with two packs, change one pack's price as admin, `GET /pedidos/{id}` shows the original total.

---

### P1: Access control and persistence errors ⭐ MVP

**User Story**: As the administrator, I want only me to change the catalogue and every database failure to come back as a clear error, so that the store stays consistent.

**Why P1**: Requirements 5 and 6 of the stage, and the write protection the user chose.

**Acceptance Criteria**:

1. WHEN any visitor, without a token or with a valid one, calls `GET` on `/equipamentos`, `/packs` or `/presets` (list or item) THEN the server SHALL answer without requiring authentication.  <!-- ERR-01 -->
2. IF a request to a catalogue `POST`/`PUT`/`DELETE` or to any `/pedidos` route has no token, or an invalid or expired one THEN the server SHALL answer `401` "Faça login para continuar."  <!-- ERR-02 -->
3. IF a `COMUM` user calls a catalogue `POST`/`PUT`/`DELETE` THEN the server SHALL answer `403` "Acesso restrito ao administrador." and change nothing.  <!-- ERR-03 -->
4. IF the database rejects a write for a unique constraint that the service did not catch first (a concurrent insert) THEN the server SHALL answer `409` with the message of that resource's duplicate rule.  <!-- ERR-04 -->
5. IF the database rejects a delete for a foreign key that the service did not catch first THEN the server SHALL answer `409` with the message of that resource's delete rule.  <!-- ERR-05 -->
6. IF the database is unreachable while the app is running THEN the server SHALL answer `503` "Serviço temporariamente indisponível. Tente novamente." and SHALL NOT expose a stack trace or SQL.  <!-- ERR-06 -->
7. IF a path id has the wrong type (`/presets/abc`) THEN the server SHALL answer `400` "Identificador inválido."  <!-- ERR-07 -->
8. IF the body is not valid JSON THEN the server SHALL answer `400` "Corpo da requisição inválido." with an empty `campos`.  <!-- ERR-08 -->
9. CORS SHALL allow the origins `http://localhost:8080` and `http://localhost:5173` for `GET`, `POST`, `PUT`, `DELETE` and `OPTIONS` on the new routes, with the `Authorization` and `Content-Type` headers.  <!-- ERR-09 -->

**Independent Test**: call `DELETE /packs/x` without a token (`401`), with a common user's token (`403`); stop PostgreSQL and call `GET /packs` (`503`).

---

### P1: API decoupled from the database ⭐ MVP

**User Story**: As the developer, I want the database confined to one layer, so that swapping it touches only that layer.

**Why P1**: Requirement 7 of the stage.

**Acceptance Criteria**:

1. Classes in `controller` and `service` SHALL NOT import `jakarta.persistence`, `org.springframework.data` or `org.hibernate` types.  <!-- ARQ-01 -->
2. Every response body SHALL be a `dto` record; no `@Entity` class SHALL be serialised to JSON.  <!-- ARQ-02 -->
3. Services SHALL depend on repository interfaces declared in `repository`, not on Spring Data interfaces directly.  <!-- ARQ-03 -->

**Independent Test**: an architecture test scans the packages and fails on a forbidden import.

---

### P2: Delivery document

**User Story**: As the student, I want the stage deliverables written down, so that the teacher can evaluate the database without reading the code.

**Why P2**: Required by the stage, but it describes the P1 work and comes after it.

**Acceptance Criteria**:

1. `docs/etapa-07.md` SHALL contain a Mermaid ER diagram of the six tables with their columns, keys and relationship cardinalities.  <!-- DOC-01 -->
2. `docs/etapa-07.md` SHALL describe each entity and each relationship in prose.  <!-- DOC-02 -->
3. `docs/etapa-07.md` SHALL give the commands to create the database (`docker compose up -d`, `.env` from `.env.example`, and starting the app so Flyway migrates).  <!-- DOC-03 -->
4. `docs/etapa-07.md` SHALL give one `curl` example with its response for create, read, update and delete of a pack, and one for creating an order.  <!-- DOC-04 -->
5. `docs/etapa-07.md` SHALL explain why PostgreSQL was chosen over a NoSQL database.  <!-- DOC-05 -->
6. `README.md` SHALL state the new stage, the PostgreSQL prerequisite and the database variables.  <!-- DOC-06 -->

**Independent Test**: follow `docs/etapa-07.md` on a clean clone and get a running API with the catalogue.

---

### P3: Proposal matches the model

**User Story**: As the student, I want `docs/proposta.md` to describe the real data model, so that the documents do not contradict each other.

**Why P3**: Documentation consistency only.

**Acceptance Criteria**:

1. `docs/proposta.md` SHALL list the entities `usuario`, `equipamento`, `pack`, `preset`, `pedido` and `item_pedido`, state that preset files live in MinIO, and SHALL NOT mention parameters.  <!-- DOC-07 -->

---

## Edge Cases

- IF a `PUT /packs/{id}` changes `estilo` or `equipamentoId` THEN the id SHALL stay the same (PCK-04), even though it no longer matches the slug.
- WHEN `precoCentavos` is exactly 0 or exactly 1000000 THEN it SHALL be accepted (PCK-09); -1 and 1000001 SHALL be rejected.
- WHEN `marca` is `"  BOSS "` THEN it SHALL be stored as `boss` and collide with the seeded Boss GT-1000 (EQP-03, EQP-07).
- IF `data` is `2026-02-30` THEN it SHALL be rejected as not a real date (PRS-09).
- WHEN the slug is built from text with accents THEN the accents SHALL be removed first, so `clássico` gives `classico`, and leading or trailing `-` SHALL be dropped (PCK-03).
- IF a field has the wrong JSON type (`"precoCentavos": "abc"`, `"equipamentoId": "x"`) THEN the server SHALL answer as ERR-08 (unreadable body).
- WHEN an order is created by a user whose account was seeded THEN `usuarioId` SHALL be 1.

Dimensions sweep: input validation (EQP-06, PCK-06 to PCK-10, PRS-07 to PRS-10, PED-07 to PED-09, ERR-07, ERR-08); failure and partial-failure states (PED-09, PED-10, ERR-06, DB-09); idempotency and duplicates (EQP-07, PCK-11, USR-07, ERR-04, DB-07; repeated orders are allowed, see Assumptions); auth boundaries (ERR-01 to ERR-03, USR-03 to USR-06; rate limiting out of scope); concurrency (USR-07, ERR-04); data lifecycle (EQP-08, PCK-12, PED-02 keeps prices; no expiry because orders are permanent history); observability N/A beyond `etapa06` CAD-02/LOG-08 because no new secret is handled, except that DB-09 names the connection without printing the password; external-dependency failure (DB-09, ERR-06; PostgreSQL is the only dependency); state-transition integrity N/A because order status is fixed at creation in this slice.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DB-01 | P1: Database | Design | Implementing |
| DB-02 | P1: Database | Design | Implementing |
| DB-03 | P1: Database | Design | Implementing |
| DB-04 | P1: Database | Design | Implementing |
| DB-05 | P1: Database | Design | Implementing |
| DB-06 | P1: Database | Design | Pending |
| DB-07 | P1: Database | Design | Implementing |
| DB-08 | P1: Database | Design | Implementing |
| DB-09 | P1: Database | Design | Implementing |
| DB-10 | P1: Database | Design | Implementing |
| USR-01 | P1: Users in the database | Design | Implementing |
| USR-02 | P1: Users in the database | Design | Implementing |
| USR-03 | P1: Users in the database | Design | Implementing |
| USR-04 | P1: Users in the database | Design | Implementing |
| USR-05 | P1: Users in the database | Design | Implementing |
| USR-06 | P1: Users in the database | Design | Implementing |
| USR-07 | P1: Users in the database | Design | Implementing |
| USR-08 | P1: Users in the database | Design | Implementing |
| EQP-01 | P1: Equipment CRUD | Design | Implementing |
| EQP-02 | P1: Equipment CRUD | Design | Pending |
| EQP-03 | P1: Equipment CRUD | Design | Pending |
| EQP-04 | P1: Equipment CRUD | Design | Pending |
| EQP-05 | P1: Equipment CRUD | Design | Pending |
| EQP-06 | P1: Equipment CRUD | Design | Pending |
| EQP-07 | P1: Equipment CRUD | Design | Implementing |
| EQP-08 | P1: Equipment CRUD | Design | Implementing |
| EQP-09 | P1: Equipment CRUD | Design | Pending |
| PCK-01 | P1: Pack CRUD | Design | Pending |
| PCK-02 | P1: Pack CRUD | Design | Pending |
| PCK-03 | P1: Pack CRUD | Design | Pending |
| PCK-04 | P1: Pack CRUD | Design | Pending |
| PCK-05 | P1: Pack CRUD | Design | Pending |
| PCK-06 | P1: Pack CRUD | Design | Pending |
| PCK-07 | P1: Pack CRUD | Design | Pending |
| PCK-08 | P1: Pack CRUD | Design | Pending |
| PCK-09 | P1: Pack CRUD | Design | Pending |
| PCK-10 | P1: Pack CRUD | Design | Pending |
| PCK-11 | P1: Pack CRUD | Design | Pending |
| PCK-12 | P1: Pack CRUD | Design | Pending |
| PCK-13 | P1: Pack CRUD | Design | Pending |
| PRS-01 | P1: Preset CRUD | Design | Pending |
| PRS-02 | P1: Preset CRUD | Design | Pending |
| PRS-03 | P1: Preset CRUD | Design | Pending |
| PRS-04 | P1: Preset CRUD | Design | Pending |
| PRS-05 | P1: Preset CRUD | Design | Pending |
| PRS-06 | P1: Preset CRUD | Design | Pending |
| PRS-07 | P1: Preset CRUD | Design | Pending |
| PRS-08 | P1: Preset CRUD | Design | Pending |
| PRS-09 | P1: Preset CRUD | Design | Pending |
| PRS-10 | P1: Preset CRUD | Design | Pending |
| PRS-11 | P1: Preset CRUD | Design | Pending |
| PRS-12 | P1: Preset CRUD | Design | Implementing |
| PED-01 | P1: Orders | Design | Pending |
| PED-02 | P1: Orders | Design | Pending |
| PED-03 | P1: Orders | Design | Pending |
| PED-04 | P1: Orders | Design | Pending |
| PED-05 | P1: Orders | Design | Pending |
| PED-06 | P1: Orders | Design | Pending |
| PED-07 | P1: Orders | Design | Pending |
| PED-08 | P1: Orders | Design | Pending |
| PED-09 | P1: Orders | Design | Pending |
| PED-10 | P1: Orders | Design | Pending |
| ERR-01 | P1: Access control and errors | Design | Implementing |
| ERR-02 | P1: Access control and errors | Design | Implementing |
| ERR-03 | P1: Access control and errors | Design | Implementing |
| ERR-04 | P1: Access control and errors | Design | Implementing |
| ERR-05 | P1: Access control and errors | Design | Implementing |
| ERR-06 | P1: Access control and errors | Design | Implementing |
| ERR-07 | P1: Access control and errors | Design | Implementing |
| ERR-08 | P1: Access control and errors | Design | Implementing |
| ERR-09 | P1: Access control and errors | Design | Implementing |
| ARQ-01 | P1: Decoupling | Design | Pending |
| ARQ-02 | P1: Decoupling | Design | Pending |
| ARQ-03 | P1: Decoupling | Design | Pending |
| DOC-01 | P2: Delivery document | - | Pending |
| DOC-02 | P2: Delivery document | - | Pending |
| DOC-03 | P2: Delivery document | - | Pending |
| DOC-04 | P2: Delivery document | - | Pending |
| DOC-05 | P2: Delivery document | - | Pending |
| DOC-06 | P2: Delivery document | - | Pending |
| DOC-07 | P3: Proposal | - | Pending |

**Coverage:** 81 total, 0 mapped to tasks, 81 unmapped ⚠️ (tasks not written yet)

---

## Success Criteria

- [ ] `cd backend && ./mvnw -q clean test` passes with Docker running, including the persistence-after-restart test (DB-06).
- [ ] `npx playwright test` still passes 354 tests with Spring on PostgreSQL (the auth pages use the database).
- [ ] Every curl example of `docs/etapa-07.md` returns the documented status on a fresh `docker compose up -d`.
