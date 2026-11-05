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

---

## Handoff

**Feature**: `etapa05-auth` (slice 2 of `.specs/features/etapa05-loja/plano.md`); slice 1 `etapa05-api-modulos` is done (Verifier PASS)
**Branch**: `feat/etapa05-loja`, not pushed
**Phase**: Execute complete, closed by user decision. Verifier: iteration 1 FAIL (M02, M13), iteration 2 FAIL (P07), iteration 3 FAIL (P07e, a meta refresh). Each gap was a test gap and is fixed; the last fix is author-checked only (no fourth run, user choice), so `validate_state.py etapa05-auth` still exits 1 by design.

**Completed**: T1 to T9 (T9 = user change request: pop-up on the library instead of a redirect) plus three rounds of test fixes. 31 of 32 requirements `Verified`; PROT-01 marked as author-checked.

**Test suite**: 180 passing. `npx playwright test` from `Corsino_Tones/`. `npm run api:reset` restores `mock/db.json` from the seed (tests add accounts with unique e-mails).

**Next step**: `docs/etapa-05.md` with screenshots in `docs/evidencias/etapa-05/` (query, submit, success, error, loading). Then slice 3 of the store plan (dynamic `preset.html?id=`, prices).

**Blockers**: none.

**Watch out for**:
- Speed: the Verifier ran the full 180-test suite per mutant (~45 s each), ~15-20 min per round. Next slices: run only the spec files that cover the mutated module.
- Candidate lessons L-006 to L-010 (password case, `replace` vs `assign`, delayed and declarative redirects). Also learned in the final fix: `toHaveCount(0)` retries can outlast a real-time navigation and pass on the next page; use one non-retrying read when proving something never appears.
- Playwright reuses servers already on :8080/:3000 outside CI; a Verifier or `npm run api` running at the same time makes the suite test that copy.
- `index.html` still says "Todos disponíveis para o download gratuito".
