# Project State

## Decisions

Architectural decisions, newest last. Written during Design; never rewritten by a handoff.

### AD-001: The login/registration switch is a 3D card flip

We will rotate the login card 180 degrees on the Y axis to reveal the registration form, over a 600ms transition.

Chosen over a horizontal slide track and a sliding coloured panel. The slide is simpler and the panel is showier, but the flip was the requested effect. Its known cost is that both faces overlap, so the card needs a single shared height or it jumps mid-rotation and shoves the page around. See AD-003.

### AD-002: Breakpoints at 768px and 1024px

We will cut the responsive layer at 768px and 1024px, giving three ranges: mobile up to 767px, tablet 768-1023px, desktop 1024px and up.

These are Tailwind's `md:` and `lg:` widths. `docs/proposta.md` commits the project to Tailwind for the React rewrite, so the breakpoints survive that migration instead of being reinvented. Rejected: keeping the existing 700px cut, which matches no device and no framework.

### AD-003: The taller face sets the card height

We will leave the registration face (three fields) in the normal flow so it sets the card's height, and take the login face out of flow to fill the same box.

Both faces then measure the same height, which AD-001 requires. Taking both out of flow collapses the card to zero height; leaving both in flow makes the card resize mid-rotation and move the footer.

### AD-004: The toggle is JavaScript, and the hidden face is `inert`

We will drive the flip with a small vanilla script (`frontend/login.js`) rather than a CSS checkbox trick, and mark the hidden face with the native `inert` attribute.

Script keeps the semantic `<button>` and is the only way to move focus to the revealed face. `inert` removes the hidden face from the tab order independently of styling, which is what makes the CSS task and the script task separately testable. Without JavaScript the flip styling never applies and both forms stay stacked and usable.

### AD-005: Playwright is the gate; tests set their own viewport

We will verify with Playwright against a real browser, one project with a desktop default, each test calling `page.setViewportSize()` for the range it asserts.

The acceptance criteria are about rendered layout, focus order and computed transforms; no DOM-only runner can observe them. Rejected: viewport *projects*, which run every test at all three widths, so a range-specific criterion fails in the other two and forces `test.skip` guards into every file.

### AD-006: Presets come from a local array

**Status**: superseded by AD-008

We will keep the preset catalogue in `frontend/dados.js` as `window.PRESETS`, and page scripts will only read that array.

Chosen over fetching a JSON file, which adds Promises and network-error handling with no server to justify them. When the Spring Boot API exists, only the source of `PRESETS` changes; filter, sort and render functions stay as they are. Feature: `etapa04-interatividade`.

### AD-007: Auth forms validate in script, with `novalidate`

We will add `novalidate` to the login and registration forms and let `frontend/login.js` write every message, next to its field, linked through `aria-describedby`.

The `required` and `type` attributes stay in the markup: they still drive `validity` and keep the browser's own checks when the script does not run. Rejected: native validation bubbles, which cannot be styled or worded consistently. Feature: `etapa04-interatividade`.

### AD-008: The catalogue comes from an HTTP API, mocked by json-server

We will fetch presets from `GET /presets`, served during development and tests by json-server 0.17.4 from `mock/db.json` on port 3000. The base URL lives only in `frontend/api/cliente.js`.

Supersedes AD-006. Stage 05 requires asynchronous calls, loading and error handling, and the store slices need writes (`POST /usuarios`, `POST /pedidos`), which a static JSON file cannot accept. Rejected: a public API, whose data has nothing to do with presets. When Spring Boot replaces the mock, only `BASE_URL` changes. Feature: `etapa05-api-modulos`.

### AD-009: Front-end code is ES modules in layered folders

We will load page code with `<script type="module">` and split it into `frontend/api/` (HTTP only), `frontend/ui/` (DOM helpers), `frontend/servicos/` (browser state such as cart and session, from slice 2 on) and `frontend/paginas/` (one entry module per page). Pages import from the other folders; `ui/` never imports `api/`; only `api/` calls `fetch`. No module writes to `window`.

Rejected: keeping classic scripts with `window.*` globals, which hide dependencies and are what stage 05 asks to replace. The layering also keeps `api/` and `servicos/` portable to a later React rewrite. Pages must be served over HTTP; `file://` blocks modules. Feature: `etapa05-api-modulos`.

### AD-010: The server is Spring MVC layers over a repository interface

We will build `backend/` as a REST API with the packages `controller`, `service`, `repository`, `model` and `dto` under `com.corsinotones`. Controllers parse JSON and call services; services hold the rules; only `repository` touches stored data, behind an interface. The first implementation keeps users in memory, seeded from `mock/db.seed.json`.

The View of MVC is the React app, so the server renders no HTML. The interface lets PostgreSQL replace the in-memory class later without touching controller or service. Rejected: Thymeleaf pages (contradict the React migration) and reading or writing `mock/db.json` directly (two processes on one file). Feature: `etapa06-spring-cadastro`.

### AD-011: Tokens are JWTs from Spring Security, signed with an environment secret

We will issue HS256 JWTs with `spring-security-oauth2-jose` (Nimbus). The secret comes from `CORSINO_JWT_SECRET` (at least 32 characters) and the app refuses to start without it; tokens last 2 hours. Passwords are stored only as BCrypt hashes, and login answers the same `401` for an unknown e-mail and a wrong password.

Rejected: the `jjwt` library (a second JWT stack next to the one protected routes will use) and a hand-built token. Secrets never go in git. Feature: `etapa06-spring-cadastro`.

### AD-012: Auth goes to Spring while the catalogue and orders stay on the mock

We will keep two API base URLs in `frontend/api/cliente.js`: `BASE_URL` (json-server, port 3000) and `SPRING_URL` (Spring Boot, port 8081). `requisicao` takes a `servidor` option to pick one; the default stays the mock. Only `/auth/*` calls use Spring for now, and each later slice moves its resource over.

Extends AD-008 (which assumed one switch of `BASE_URL`): the migration is gradual, so both servers must coexist. Rejected: a proxy in front of both, which adds a process for a temporary state. Feature: `etapa06-front-spring-auth`.

### AD-013: PostgreSQL holds the server data, and Flyway owns the schema

We will store users, equipments, packs, presets and orders in PostgreSQL 16. Versioned SQL migrations in `backend/src/main/resources/db/migration/` create and change every table; Hibernate runs with `ddl-auto=validate` and never alters the schema. Connection settings come from `CORSINO_DB_URL`, `CORSINO_DB_USER` and `CORSINO_DB_PASSWORD`; development uses the repo-root `docker-compose.yml`. Preset files will live in MinIO, with only their key in `preset.arquivo_chave`.

Extends AD-010, whose in-memory store this replaces. Rejected: `ddl-auto=update` (unreviewed schema changes), a NoSQL store (the data is relational, with foreign keys between all six tables) and file contents in the database (`bytea` bloats backups). Feature: `etapa07-persistencia`.

### AD-014: The model stays plain records; JPA lives only in `repository/jpa`

We will keep `model` as Java records without persistence annotations. Each repository interface in `repository` gets one adapter in `repository/jpa`, which owns the `@Entity` class, a package-private Spring Data interface and the conversion. Adapters flush writes and translate named constraint violations into `Duplicado` and `EmUso`. Classes in `controller` and `service` never import `jakarta.persistence`, `org.springframework.data` or `org.hibernate`.

Rejected: annotating the model as entities, which lets lazy proxies and open sessions reach the services. Feature: `etapa07-persistencia`.

### AD-015: Protected routes use the Spring Security resource server with a `perfil` claim

We will validate bearer tokens with `spring-boot-starter-security-oauth2-resource-server` and the `JwtDecoder` of AD-011. The token's `perfil` claim (`COMUM` or `ADMIN`) becomes the role. Catalogue reads are public, catalogue writes need `ADMIN`, orders need any signed-in user. Registration always creates `COMUM`; only the seeder grants `ADMIN`.

Rejected: a hand-written token filter. Feature: `etapa07-persistencia`.

### AD-016: Backend tests run on PostgreSQL through Testcontainers

We will run `./mvnw test` against a real `postgres:16-alpine` container started by Testcontainers and wired with `@ServiceConnection`. The Docker daemon must be running. Tests that need an empty database use their own container.

Rejected: H2, which hides PostgreSQL-specific SQL and constraint behaviour. Feature: `etapa07-persistencia`.

---

## Handoff

- **Feature**: `etapa07-persistencia` (`.specs/features/etapa07-persistencia/`)
- **Phase / Task**: all 27 tasks implemented (T21-T27 finished on 2026-11-25). Next: the independent Verifier (fresh sub-agent, writes `validation.md`), then `validate_state.py`.
- **Completed**: T1-T20 committed (7917fa5..c7cf0a9, plus 4269a43). T21-T27 are done on disk but **not committed**: gate green, 267 backend tests, 354 Playwright tests.
- **In-progress** (file:line): none.
- **Next step**: commit T21-T27 as separate atomic commits when the user asks (messages are in `tasks.md`), then run the Verifier. Open assumption to log: an unknown `?status=` on `GET /pedidos` answers `[]` (no spec AC, no test).
- **Blockers**: none. Port 8081 is free now; never touch the `pedalpacks-*` containers.
- **Environment**: dev database `corsino_tones-postgres-1` on host port 5433 (`docker compose up -d`); `.env` holds its password (git-ignored). Docker must be running for `./mvnw test`. Node needs `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`. The dev database now holds one extra order and the pack `funk-boss-gt-1000` from the T25 curl examples.
- **Uncommitted files**: T21-T27 work (`PedidoController`, `PedidoRequest`, `PedidoResponse`, `PedidoControllerTest`, `PedidoControllerFalhaTest`, `ArquiteturaTest`, `plantado/Plantados.java`, `PersistenciaAposReinicioTest`, `playwright.config.js`, `docs/etapa-07.md`, `README.md`, `docs/proposta.md`, `tasks.md`) plus the user's own pending files (`.specs/LESSONS.md`, `.specs/lessons.json`, `AuthControllerCadastroTest.java`, `frontend/servicos/carrinho.js`, `.specs/features/etapa06-react-catalogo/`).
- **Branch**: `feat/etapa07-persistencia`, not pushed, no PR.
- **Carried over from stage 06**: non-blocking gaps of `etapa06-spring-cadastro/validation.md` (SRV-02, SRV-03, LOG-09, SEED-04, M8), deferred by the user; `etapa06-react-catalogo` has a spec only.
