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

---

## Handoff

**Feature**: `login-flip-responsive`
**Branch**: `feat/login-flip-responsive`
**Phase**: 3 of 3 (Three-tier responsive layout)
**Working tree**: clean, everything committed

**Completed**: T1 through T6.

| Task | Commit | What |
| ---- | ------ | ---- |
| - | `3899a18` | spec.md + tasks.md |
| T1 | `9bc83ed` | npm manifest, Playwright dev dependency |
| T2 | `36fd971` | Playwright config |
| - | `df46dbc` | fix: viewport per test, not per project |
| T3 | `464757d` | registration form as the card's second face |
| - | `e767283` | fix: threaded server, workers capped at 2 |
| T4 | `c509a82` | face toggle with `inert` and focus management |
| T5 | `36a34ac` | 3D flip, shared height, reduced-motion fallback |
| T6 | `2c73f48` | mobile breakpoint moved 700px -> 767px |

**Test suite**: 22 passing, ~22s. Run with `npx playwright test` from `Corsino_Tones/`.

**Next step**: T7 - filter sidebar and preset grid per range (`frontend/style.css`). The tablet (768-1023px) and desktop (1024px+) media blocks do not exist yet; T7 creates them. Write `tests/responsive.spec.js` assertions first, deriving column counts from the cards' rendered X positions rather than from CSS text.

**Then**: T8 (preset detail, login card fit, no horizontal overflow, plus RESP-01), followed by the Verifier sub-agent, which is mandatory and never prompted.

**Blockers**: none.

**Watch out for**:
- Four of the six tests written for T5 initially passed with no implementation at all. Before implementing any task, confirm its new tests actually fail, and for the right reason.
- RESP-01 was moved from T6 to T8; the requirement coverage table in `tasks.md` reflects this.
- The two `Tests: none` warnings from `validate_tasks.py` are expected: T1 and T2 create no product behaviour.
