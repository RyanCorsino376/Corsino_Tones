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

---

## Handoff

**Feature**: stage 06, server part: `etapa06-spring-cadastro` and `etapa06-front-spring-auth` (both implemented)
**Branch**: `feat/etapa06-spring-cadastro`, not pushed, no PR
**Phase**: both features done and Verifier PASS (`validation.md` in each folder). `etapa06-front-spring-auth` passed on iteration 2 after test-only fixes.

**Gate**: `npx playwright test` = 354 passed; `cd backend && ./mvnw -q clean test` = 76 passed (2026-11-18). Node is not on PATH in this WSL shell: run `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` first.

**Next step**: open the PR for the branch, then start the next slice (packs and presets endpoints on Spring, then orders). The React part (`etapa06-react-catalogo`) has a spec only and no code.

**Open gaps (deferred by the user)**: non-blocking gaps of `etapa06-spring-cadastro/validation.md`: SRV-02 (port asserted by property only), SRV-03 (layer rule only checks the controller), LOG-09 (absent secret tested as empty), SEED-04 (seed file read-only check), M8 (dummy hash validity).

**Uncommitted**: `.specs/LESSONS.md` and `.specs/lessons.json` (user's earlier edits mixed with lessons L-023 to L-031 from the Verifiers; decide before committing), `.specs/features/etapa06-react-catalogo/` (untracked).

**Dev servers**: not running. Start order and commands: README, section "Como executar". Spring needs `CORSINO_JWT_SECRET` (32+ characters).
