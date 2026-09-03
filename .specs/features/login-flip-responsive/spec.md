# Login Card Flip & Three-Tier Responsive Layout Specification

## Problem Statement

The login screen offers a "Não tenho conta" button that does nothing: there is no registration form anywhere in the project, and no `cadastro.html`. Separately, the whole site adapts through a single breakpoint at `max-width: 700px`, so tablets get the phone layout even though they have room for more. Both gaps sit in the static prototype that will later be rebuilt in React, so the work must be cheap to discard while still being correct today.

## Goals

- [ ] A visitor can move between the login and registration forms on `login.html` without a page load, through a 3D card flip, and can complete either form with the keyboard alone.
- [ ] Every page renders a layout deliberately chosen for one of three viewport ranges, with no horizontal page scrolling from 320px upward.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Submitting either form to a server | No backend exists; both forms stay inert until the Spring Boot API is built |
| Password recovery | The "Esqueci a senha" link stays a placeholder; `docs/proposta.md` does not list recovery as a feature |
| Migration to React, Vite or Tailwind | The prototype stays plain HTML/CSS; the migration is its own feature |
| Validation beyond the browser's native `required` and `type` checks | Custom rules (password strength, e-mail uniqueness) belong to the authentication feature |
| Adding the missing "Entrar" nav link to `login.html` | Pre-existing inconsistency found while reading the code, unrelated to either change |
| Any change to `index.html`, `presets.html`, `preset.html`, `biblioteca.html` markup | The responsive work is CSS-only; those files already carry the classes it needs |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Flip style | 3D rotation on the Y axis, 600ms | User picked it over horizontal slide and sliding panel | y |
| Breakpoint values | 768px and 1024px | User picked it; matches Tailwind `md:` and `lg:`, which the planned React rewrite will use | y |
| Tablet preset grid | Exactly two columns | Shown in the approved breakpoint preview | y |
| Toggle mechanism | A small vanilla JS file, `frontend/login.js` | Keeps the semantic `<button>`, and only script can move focus to the revealed face; the project has no JS yet, and the file is disposable once React lands | n |
| Registration fields | Name, e-mail, password | The data model in `docs/proposta.md` lists exactly these; no confirm-password field is specified there | n |
| Card height | Both faces share one `min-height` sized to the taller (registration) face | A 3D flip overlaps the faces; without a shared height the card jumps mid-rotation and shifts the page | n |
| Reduced motion | Honour `prefers-reduced-motion: reduce` by switching faces instantly | A rotating card is vestibular-triggering motion; the flip is decoration, the form is the function | n |
| No-JavaScript fallback | Both forms render stacked and fully usable | Progressive enhancement: the flip is an enhancement, so a script failure must not remove the ability to register | n |
| Spec language | English | `validate_spec.py` matches `SHALL` and the EARS lead keywords in English; a Portuguese spec silently fails the gate | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Flip between login and registration ⭐ MVP

**User Story**: As a visitor without an account, I want the login card to flip over and show me a registration form so that I can create my account without leaving the page.

**Why P1**: The button already exists in the interface and leads nowhere. A visible dead end is worse than no button at all.

**Acceptance Criteria**
1. WHEN the visitor activates the "Não tenho conta" button THEN the card SHALL rotate 180 degrees on the Y axis over 600ms and present the registration face.
2. WHEN the visitor activates the "Já tenho conta" button THEN the card SHALL rotate back to 0 degrees and present the login face.
3. WHEN a face becomes the presented face THEN the system SHALL move keyboard focus to that face's first input.
4. WHILE the registration face is presented, the system SHALL keep every control on the login face out of the keyboard tab order.
5. WHILE the login face is presented, the system SHALL keep every control on the registration face out of the keyboard tab order.
6. The card SHALL occupy the same height on both faces so that no surrounding element moves during the rotation.
7. The registration face SHALL collect name, e-mail and password.
8. WHERE the user agent reports `prefers-reduced-motion: reduce`, the system SHALL change faces with no rotation and no transition.
9. IF the visitor activates a toggle button while a rotation is running THEN the system SHALL settle on the face matching the most recent activation.
10. IF JavaScript does not run THEN the system SHALL present the login form and the registration form stacked, both fully usable.

**Independent Test**: Open `frontend/login.html`, click "Não tenho conta" and watch the card turn to the registration form; press Tab repeatedly and confirm focus never lands on a hidden field; disable JavaScript, reload, and confirm both forms are present and fillable.

---

### P1: Three deliberate viewport ranges ⭐ MVP

**User Story**: As a visitor on a phone, tablet or desktop, I want the layout to use the space my screen actually has so that I am not given a phone layout on a tablet.

**Why P1**: `docs/proposta.md` states as a non-functional requirement that the screens must work on phone, tablet and desktop. One breakpoint does not satisfy three targets.

**Acceptance Criteria**
1. The stylesheet SHALL express its responsive rules through exactly three viewport ranges: up to 767px, 768px to 1023px, and 1024px upward.
2. WHILE the viewport is narrower than 768px, the system SHALL stack the filter sidebar above the results and render the preset grid in one column.
3. WHILE the viewport is between 768px and 1023px, the system SHALL stack the filter sidebar above the results and render the preset grid in exactly two columns.
4. WHILE the viewport is 1024px or wider, the system SHALL place the filter sidebar beside the results as a sticky column.
5. WHILE the viewport is narrower than 768px, the system SHALL wrap the navigation links onto multiple lines and place the "Entrar" link in the normal document flow rather than absolute positioning.
6. WHILE the viewport is narrower than 768px, the system SHALL render the preset detail top section in a single column.
7. The system SHALL NOT produce horizontal page scrolling at any viewport width from 320px upward.
8. WHILE the viewport is narrower than 768px, the login card SHALL fit inside the viewport width while both faces keep the same height.

**Independent Test**: Open each page at 375px, 820px and 1440px in the browser's device toolbar; confirm the sidebar position and column count match the range, and that the horizontal scrollbar never appears.

---

## Edge Cases

- IF a required registration field is empty on submit THEN the browser SHALL block submission and report the offending field through native constraint validation.
- IF the registration face is taller than the viewport on a small screen THEN the page SHALL scroll vertically without clipping the card.
- WHEN the viewport crosses a breakpoint while the card shows the registration face THEN the system SHALL keep the registration face presented.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FLIP-01 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-02 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-03 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-04 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-05 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-06 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-07 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-08 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-09 | P1: Flip between login and registration | Tasks | Pending |
| FLIP-10 | P1: Flip between login and registration | Tasks | Pending |
| RESP-01 | P1: Three deliberate viewport ranges | Tasks | Pending |
| RESP-02 | P1: Three deliberate viewport ranges | Tasks | Pending |
| RESP-03 | P1: Three deliberate viewport ranges | Tasks | Pending |
| RESP-04 | P1: Three deliberate viewport ranges | Tasks | Pending |
| RESP-05 | P1: Three deliberate viewport ranges | Tasks | Pending |
| RESP-06 | P1: Three deliberate viewport ranges | Tasks | Pending |
| RESP-07 | P1: Three deliberate viewport ranges | Tasks | Pending |
| RESP-08 | P1: Three deliberate viewport ranges | Tasks | Pending |
| EDGE-01 | Edge cases | Tasks | Pending |
| EDGE-02 | Edge cases | Tasks | Pending |
| EDGE-03 | Edge cases | Tasks | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending -> In Design -> In Tasks -> Implementing -> Verified

**Coverage:** 21 total, 0 mapped to tasks, 21 unmapped (mapping happens in the Tasks phase)

---

## Success Criteria

- [ ] A keyboard-only user can reach, fill and submit either form without focus ever landing on a control belonging to the hidden face.
- [ ] The card's bounding box height is identical on both faces, so no element below it shifts during a flip.
- [ ] With JavaScript disabled, both forms are present and fillable on `login.html`.
- [ ] At 375px, 820px and 1440px, every page matches its range's expected layout with no horizontal scrollbar.
- [ ] With `prefers-reduced-motion: reduce` active, switching faces produces no rotation.
