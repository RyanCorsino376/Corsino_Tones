# Login Card Flip & Three-Tier Responsive Layout - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/login-flip-responsive/spec.md`
**Design**: none - no architectural decisions; the design is inline in the tasks below
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied. The repository has no `AGENTS.md`, no `CONTRIBUTING.md`, no test runner config and no CI workflow; `docs/proposta.md` states the non-functional requirement that screens must work on phone, tablet and desktop, which the RESP expectations below encode.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Page markup (`frontend/login.html`) | e2e | Every structural AC it satisfies, plus the no-JavaScript path | `tests/*.spec.js` | `npm test` |
| Toggle script (`frontend/login.js`) | e2e | All branches; 1:1 to the FLIP acceptance criteria; every listed edge case | `tests/*.spec.js` | `npm test` |
| Stylesheet (`frontend/style.css`) | e2e | Every RESP acceptance criterion asserted at all three viewport ranges | `tests/*.spec.js` | `npm test` |
| Test config (`package.json`, `playwright.config.js`) | none | - (build gate only) | - | build gate only |

Rationale for e2e everywhere: the acceptance criteria are about rendered layout, focus order and computed transforms. A DOM-only runner cannot observe any of them, so the browser is the only honest oracle.

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks that only touch the flip behaviour | `npx playwright test tests/login-flip.spec.js` |
| Full | After tasks that touch responsive layout, or any task after T5 | `npx playwright test` |
| Build | After config-only tasks | T1: `npx playwright --version` - T2: `node -e "require('./playwright.config.js')"` |

The project has no linter or formatter configured, so the Build gate verifies only that the runner is installed (T1) and that the config file parses and loads (T2). `playwright test --list` cannot serve as their gate: it exits 1 with "No tests found" until T3 writes the first spec file. Adding a linter is out of scope for this feature.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Test harness

Nothing can be gated until a runner exists. Config-only, no product behaviour.

```
T1 -> T2
```

### Phase 2: Card flip

Markup first, then the state machine, then the visual rotation. This order keeps every task independently testable: the script drives `data-vista` and `inert`, both observable without any 3D CSS.

```
T3 -> T4 -> T5
```

### Phase 3: Three-tier responsive layout

Rewrites the responsive layer against the three ranges. Runs last because RESP-08 asserts the login card, which Phase 2 creates.

```
T6 -> T7 -> T8
```

---

## Task Breakdown

### T1: Node scaffold for the test runner

**What**: Create the npm manifest declaring Playwright as the only dev dependency, with a `test` script, plus the ignore file that keeps `node_modules` and Playwright's output out of git.
**Where**: `Corsino_Tones/package.json`, plus `Corsino_Tones/.gitignore`
**Depends on**: None
**Reuses**: Nothing - the project has no manifest today
**Requirement**: none (test infrastructure)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `package.json` declares `@playwright/test` as a devDependency and a `test` script running `playwright test`
- [x] `.gitignore` ignores `node_modules/`, `test-results/`, `playwright-report/`
- [x] `npm install` completes and `npx playwright install chromium` fetches the browser
- [x] Build gate passes: `npx playwright --version` -> `Version 1.62.1`, exit 0

**Tests**: none
**Gate**: build

**Commit**: `chore(test): add npm manifest and playwright dev dependency`

**Status**: Complete

---

### T2: Playwright config with the three viewport projects

**What**: Configure Playwright with a static `webServer` serving the repository over Python's built-in HTTP server, a `baseURL` pointing at `frontend/`, and a desktop default viewport that range-specific tests override per test.
**Where**: `Corsino_Tones/playwright.config.js`
**Depends on**: T1
**Reuses**: `frontend/` served as-is; pages reference `../imagens/`, so the server root is the repository root, not `frontend/`
**Requirement**: none (test infrastructure)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `webServer` starts `python3 -m http.server 8080` from the repository root and reuses an existing server locally
- [x] `baseURL` resolves so a test can navigate to `login.html` and the logo at `../imagens/LogoSite.svg` returns 200 -> both returned 200 over the same server
- [x] The default viewport is 1440x900, and tests assert narrower ranges with `page.setViewportSize()`
- [x] Build gate passes: `node -e "require('./playwright.config.js')"`, exit 0

Corrected after the fact: the task originally specified three viewport *projects*. That runs every test at all three widths, so a range-specific criterion ("sidebar beside the results at 1024px up") would fail in the other two ranges and force `test.skip` noise into every spec. Each test now names its own width, matching how the acceptance criteria are written.

**Tests**: none
**Gate**: build

**Commit**: `chore(test): configure playwright with mobile, tablet and desktop projects`

**Status**: Complete

---

### T3: Two-faced login markup with the registration form

**What**: Restructure the login card into a front face holding the existing login form and a back face holding a new registration form (name, e-mail, password), each with its own toggle button, without any flip styling yet.
**Where**: `Corsino_Tones/frontend/login.html`
**Depends on**: T2
**Reuses**: The existing `.login`, `.loginCampos`, `.loginBt` and `fieldset` classes from `frontend/style.css:441-497`; the `autocomplete` attribute pattern already used on the login inputs
**Requirement**: FLIP-07, FLIP-10, EDGE-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] The registration face has labelled `name`, `email` and `password` inputs, all `required`, with `autocomplete="name"`, `"email"` and `"new-password"` -> `tests/login-flip.spec.js:17-25`
- [x] The "Não tenho conta" button and a new "Já tenho conta" button each carry an explicit `type="button"` -> `tests/login-flip.spec.js:31-32`
- [x] With JavaScript disabled, both forms render stacked and every field is fillable -> `tests/login-flip.spec.js:57-70`
- [x] Submitting the registration form with an empty required field is blocked by the browser -> `tests/login-flip.spec.js:45-47`
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 4 tests pass (no silent deletions)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(login): add registration form as the card's second face`

**Status**: Complete

---

### T4: Face-toggle script driving state, inert and focus

**What**: Add the toggle script that flips `data-vista` between `login` and `cadastro` on the card, marks the hidden face `inert`, and moves focus to the revealed face's first input; it also tags the card as script-enabled so the CSS in T5 can apply the flip only when JavaScript ran.
**Where**: `Corsino_Tones/frontend/login.js`
**Depends on**: T3
**Reuses**: The `data-vista` attribute contract established in T3's markup
**Requirement**: FLIP-03, FLIP-04, FLIP-05, FLIP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Clicking "Não tenho conta" sets `data-vista="cadastro"`; clicking "Já tenho conta" sets it back to `login` -> `tests/login-flip.spec.js:54-66`
- [x] The hidden face carries `inert`, so tabbing from the last visible control never lands inside it -> `tests/login-flip.spec.js:75-98`
- [x] Focus moves to the revealed face's first input on every switch -> `tests/login-flip.spec.js:101-107`
- [x] Three rapid alternating clicks settle on the face matching the last click -> `tests/login-flip.spec.js:110-119`
- [x] Full gate passes: `npx playwright test`, exit 0
- [x] Test count: 10 tests pass (no silent deletions)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(login): toggle card faces with inert and focus management`

**Status**: Complete

Two test-side corrections were needed and are recorded here rather than hidden:
1. The "Já tenho conta" test passed against a no-op implementation, because `data-vista` already starts at `login`. An intermediate assertion on `cadastro` was added so the test can actually fail.
2. The EDGE-01 test now flips the card before submitting. The submit button sits on the inert face, which is exactly what FLIP-05 mandates; the assertions themselves are unchanged.

---

### T5: 3D flip styling with shared height and reduced-motion fallback

**What**: Add the 3D rotation styles that turn the card 180 degrees on the Y axis when `data-vista="cadastro"`, pin both faces to one shared height, and collapse the transition to nothing under `prefers-reduced-motion: reduce`.
**Where**: `Corsino_Tones/frontend/style.css`
**Depends on**: T4
**Reuses**: The existing `--bg-card` and `--border-subtle` custom properties from `frontend/style.css:1-14`; the `.login` box model already defined at `frontend/style.css:449`
**Requirement**: FLIP-01, FLIP-02, FLIP-06, FLIP-08, EDGE-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The card's computed transform reaches `rotateY(180deg)` on the registration face and `rotateY(0)` on the login face, over a 600ms transition
- [ ] The card's bounding box height is identical on both faces, and the footer's Y position does not move during a flip
- [ ] Under emulated `prefers-reduced-motion: reduce`, the computed `transition-duration` is `0s` and the face still switches
- [ ] Resizing across 768px and 1024px while the registration face is shown keeps `data-vista="cadastro"`
- [ ] Full gate passes: `npx playwright test`
- [ ] Test count: 16 tests pass (no silent deletions)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(login): flip the card in 3d with a shared height and reduced-motion fallback`

---

### T6: Replace the single breakpoint with three viewport ranges

**What**: Restructure the responsive section into the three ranges (up to 767px, 768-1023px, 1024px up), moving the existing header and navigation rules from the old 700px block into the mobile range.
**Where**: `Corsino_Tones/frontend/style.css`
**Depends on**: T5
**Reuses**: The rules already written in the `@media (max-width: 700px)` block at `frontend/style.css:497-560`, which are re-homed rather than rewritten
**Requirement**: RESP-01, RESP-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] The stylesheet contains exactly three media queries: `max-width: 767px`, `min-width: 768px` and `max-width: 1023px`, and `min-width: 1024px`
- [ ] Below 768px the navigation links wrap onto more than one line and `.entrar` computes to `position: static`
- [ ] At 820px and 1440px the navigation stays on one line with `.entrar` absolutely positioned
- [ ] Full gate passes: `npx playwright test`
- [ ] Test count: 22 tests pass (no silent deletions)

**Tests**: e2e
**Gate**: full

**Commit**: `refactor(css): split the single breakpoint into three viewport ranges`

---

### T7: Filter sidebar and preset grid per range

**What**: Set the presets page layout per range - sidebar stacked above the results below 1024px, beside them as a sticky column at 1024px and up - and pin the preset card grid to one column on mobile and exactly two on tablet.
**Where**: `Corsino_Tones/frontend/style.css`
**Depends on**: T6
**Reuses**: The `.layout` grid at `frontend/style.css:170` and the `.grade-presets` `auto-fill` grid at `frontend/style.css:414`, which currently sizes itself and must be constrained per range
**Requirement**: RESP-02, RESP-03, RESP-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] At 375px the sidebar sits above the results and the preset grid renders one column
- [ ] At 820px the sidebar sits above the results and the preset grid renders exactly two columns
- [ ] At 1440px the sidebar sits beside the results and `.filtros-fixos` computes to `position: sticky`
- [ ] Column counts are asserted from the cards' rendered X positions, not from the CSS text
- [ ] Full gate passes: `npx playwright test`
- [ ] Test count: 28 tests pass (no silent deletions)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(css): lay out filters and preset grid per viewport range`

---

### T8: Preset detail, login card fit and no horizontal overflow

**What**: Make the preset detail top section stack below 768px, keep the login card inside the viewport on small screens without breaking the shared face height, and assert that no page scrolls horizontally from 320px upward.
**Where**: `Corsino_Tones/frontend/style.css`
**Depends on**: T7
**Reuses**: The `.preset-topo` grid at `frontend/style.css:288` and the `.login` width already capped with `min(400px, 100%)` at `frontend/style.css:449`
**Requirement**: RESP-06, RESP-07, RESP-08, EDGE-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Below 768px `.preset-topo` renders one column; at 1024px and up it renders two
- [ ] At 320px and 375px the login card fits the viewport and both faces still report the same height
- [ ] `document.documentElement.scrollWidth` never exceeds the viewport width on all five pages at 320px, 375px, 820px and 1440px
- [ ] When the registration face is taller than a short viewport, the page scrolls vertically and the card is not clipped
- [ ] Full gate passes: `npx playwright test`
- [ ] Test count: 36 tests pass (no silent deletions)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(css): stack preset detail and guarantee no horizontal overflow`

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 -> Phase 2 -> Phase 3

T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8
```

Execution is strictly sequential - there is no intra-phase parallelism. Eight tasks fit a single task-budgeted batch (<= ~8), so execution happens inline in the main window with no batch sub-agents. The Verifier still runs automatically after T8.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Node scaffold | 1 manifest + its ignore file | Granular |
| T2: Playwright config | 1 config file | Granular |
| T3: Two-faced markup | 1 HTML file | Granular |
| T4: Toggle script | 1 JS file | Granular |
| T5: 3D flip styling | 1 CSS section | Granular |
| T6: Three ranges | 1 CSS section | Granular |
| T7: Filters and grid | 1 CSS section | Granular |
| T8: Detail, card fit, overflow | 1 CSS section | Granular |

T5 through T8 all edit `style.css`, but each owns a distinct, non-overlapping section of it, and each is separately revertable.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |
| T7 | T6 | T6 -> T7 | Match |
| T8 | T7 | T7 -> T8 | Match |

No task depends on a later phase; the chain points strictly backward.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Test config | none | none | OK |
| T2 | Test config | none | none | OK |
| T3 | Page markup | e2e | e2e | OK |
| T4 | Toggle script | e2e | e2e | OK |
| T5 | Stylesheet | e2e | e2e | OK |
| T6 | Stylesheet | e2e | e2e | OK |
| T7 | Stylesheet | e2e | e2e | OK |
| T8 | Stylesheet | e2e | e2e | OK |

`Tests: none` appears only on T1 and T2, which create no product behaviour and match the matrix's "none" row.

---

## Requirement Coverage

| Requirement | Task |
| ----------- | ---- |
| FLIP-01, FLIP-02, FLIP-06, FLIP-08 | T5 |
| FLIP-03, FLIP-04, FLIP-05, FLIP-09 | T4 |
| FLIP-07, FLIP-10 | T3 |
| RESP-01, RESP-05 | T6 |
| RESP-02, RESP-03, RESP-04 | T7 |
| RESP-06, RESP-07, RESP-08 | T8 |
| EDGE-01 | T3 |
| EDGE-02 | T8 |
| EDGE-03 | T5 |

**Coverage:** 21 requirements, 21 mapped to tasks, 0 unmapped.
