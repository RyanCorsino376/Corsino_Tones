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

**Feature**: `etapa05-carrinho` (slice 4 of `.specs/features/etapa05-loja/plano.md`); slices 1-3 done
**Branch**: `feat/etapa05-loja`, not pushed (push/PR not authorized yet)
**Phase**: Execute complete; Verifier PASS on iteration 2 (iteration 1: six weak tests, no code defect, all fixed)

**What exists now**: packs of one style for one pedalboard model (slice 3) and a cart kept in `localStorage` (`corsino:carrinho`): "Adicionar ao carrinho" on the pack page, "Carrinho (N)" in every header, `carrinho.html` with removal and total. One cart per browser; "Sair" empties it.

**Completed**: T1-T4 plus one round of test fixes. 27 of 27 requirements `Verified`; `validate_state.py etapa05-carrinho` exits 0.

**Test suite**: 272 passing. `npx playwright test`. The machine was slower on 2026-11-09 (full suite 1.5-2.5 min).

**Next step**: slice 5, checkout and order ("Finalizar compra" on the cart page, login required, simulated card payment, `POST /pedidos` with `packIds`, approved/declined screen, cart emptied only when approved). Then slice 6 (library with downloads) and slice 7 (documentation).

**Blockers**: none.

**Watch out for**:
- Open UX choice for the user: a double click on "Adicionar ao carrinho" stores the pack once, but the second click follows the "No carrinho" link to the cart page.
- The cart icon is the Lucide "shopping-cart" placeholder; the user may bring their own SVG (same `viewBox 0 0 24 24`, `currentColor`, stroke 2), in the six HTML files.
- Dev servers (`npm run api`, `python3 -m http.server 8080`) occupy ports 3000/8080; stop them before a Verifier run (its scratch tree starts its own servers with `CI=1`).
- Lessons: L-002 and L-003 confirmed; candidates L-011 to L-018 (see `.specs/LESSONS.md`).
- `docs/proposta.md` still describes free presets; `docs/etapa-05.md` covers slices 1-2 only.
