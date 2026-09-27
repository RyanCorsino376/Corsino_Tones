# Interactive Preset List & Login Validation Specification

## Problem Statement

`docs/Requisitos_Etapa04/requisitos.md` requires the application to show DOM manipulation, event handling, form validation, dynamic interface changes, functions, arrays, iteration methods and handling of invalid situations, with at least one feature whose behaviour HTML and CSS cannot produce alone.

The prototype has none of that outside the login card flip. `presets.html` carries a filter form (brand checkboxes, "Aplicar", "Limpar") that does nothing and nine empty `<a class="cartao">` placeholders; `index.html` has nine empty carousel cards; the login and registration forms rely only on the browser's `required` and `type` checks. There is also no data at all: the Spring Boot API that will supply presets does not exist yet.

## Goals

- [ ] A visitor can narrow the preset list by brand, style and free text, and reorder it, without a page load, and always sees how many presets match - including when none do.
- [ ] A visitor who submits the login or registration form with invalid data sees, next to each offending field, a message saying what is wrong, and the form is not sent.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Dynamic preset detail page (`preset.html?id=`) | Left for a later step; the user chose the core scope (items 1-6 + 9 of the analysis) |
| Favourites and the Biblioteca list | Same as above |
| Modal dialogs and carousel arrows | Optional items, not chosen |
| Fetching presets from a server or a JSON file | No backend exists; see AD-006 |
| Pagination | `docs/proposta.md` lists it, but nine sample presets fit one page |
| Submitting either auth form to a server | No auth endpoint exists |
| Persisting filter state across page loads (URL or storage) | Not required; the list resets on reload |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Scope | Items 1-6 and 9 of the analysis | User picked "Núcleo (1-6 + 9)" | y |
| Data source | A global array `PRESETS` in `frontend/dados.js` | No backend; an array keeps the work on the stage requirements and is swapped for an API call later without touching filter/render functions (AD-006) | n |
| Catalogue size and shape | 9 presets; fields `id`, `nome`, `marca`, `equipamento`, `estilo`, `data` (ISO `YYYY-MM-DD`), `descricao` | Matches the nine placeholders and the `Preset` entity in `docs/proposta.md`; every brand checkbox value appears at least once | n |
| Styles | `rock`, `blues`, `metal`, `clean` | Four groups are enough to exercise the filter; each appears at least once | n |
| Filter semantics | OR inside a group, AND across groups; an empty group does not restrict | Standard faceted-search behaviour; "Boss or NUX, and metal" | n |
| Search fields | `nome`, `equipamento`, `descricao`; case- and accent-insensitive; surrounding whitespace ignored | A user typing "distorcao" expects "Distorção" | n |
| Name order sample | At least one sample name starts with an accented letter ("Ápice do Solo") | Without it, `pt-BR` collation and plain code-point order give the same list and a test cannot tell them apart (Verifier gap, FILT-07) | y |
| Default order | Newest first | `docs/proposta.md`: "do mais recente para o mais antigo" | n |
| Update trigger | Every `input`/`change` updates the list; "Aplicar" also works and never reloads the page | Proposal: "atualiza o resultado sem recarregar a página"; keeping "Aplicar" avoids a dead button | n |
| Card link target | `preset.html` (unchanged) | Detail page is out of scope | n |
| No-JavaScript fallback on presets | A `<noscript>` message explains the list needs JavaScript | Cards are generated from data; there is nothing static to fall back to | n |
| Validation mechanism | `novalidate` on both forms plus a script that applies the rules and writes the messages (AD-007) | Native bubbles cannot be styled, differ per browser and cannot express "minimum 8 characters" in Portuguese consistently | n |
| Password rule | Registration: at least 8 characters. Login: not empty | Length is a creation rule; applying it at login would reject accounts created under a different rule | n |
| Name rule | At least 2 non-whitespace characters after trimming | Rejects blank and single-letter names | n |
| E-mail rule | `^[^\s@]+@[^\s@]+\.[^\s@]+$` after trimming | Catches the common mistakes without pretending to be RFC 5322 | n |
| Field messages | Name: "Informe um nome com pelo menos 2 caracteres." · E-mail (both forms): "Informe um e-mail válido, como nome@exemplo.com." · Registration password: "A senha precisa ter pelo menos 8 caracteres." · Login password: "Informe sua senha." | Fixing the wording makes "Portuguese message" testable; any text change now goes through the spec (Verifier gap, VAL-03) | y |
| Valid submit | Blocked (no server) and a success message is shown | Otherwise a valid form would appear to do nothing | n |
| Spec language | English | `validate_spec.py` matches the EARS keywords in English | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Preset catalogue rendered from data MVP

**User Story**: As a visitor, I want the preset cards to show real preset information so that I can tell presets apart.

**Why P1**: Every filter, search and sort acts on this list; without it nothing else is observable.

**Acceptance Criteria**
1. The system SHALL hold the preset catalogue as an array of 9 objects, each with `id`, `nome`, `marca`, `equipamento`, `estilo`, `data` and `descricao`.
2. WHEN `presets.html` loads THEN the system SHALL render one card per catalogue entry inside `.grade-presets`, newest first.
3. Each card SHALL show the preset name, the brand and equipment, and the style, and SHALL link to `preset.html`.
4. WHEN `index.html` loads THEN the system SHALL render the catalogue entries in the carousel, newest first.
5. IF JavaScript does not run on `presets.html` THEN the system SHALL show a message stating that the list requires JavaScript.

**Independent Test**: Open `presets.html`; nine cards appear, each with a name, brand/equipment and style, the most recent first.

---

### P1: Filter, search and sort ⭐ MVP

**User Story**: As a guitarist, I want to narrow the list to my brand and style, search by name, and change the order so that I find a preset for my equipment quickly.

**Why P1**: This is the stage's required "behaviour not obtainable with HTML and CSS alone".

**Acceptance Criteria**
1. WHEN the visitor checks or unchecks a brand checkbox THEN the system SHALL show only presets whose `marca` is one of the checked brands, without reloading the page.
2. WHEN the visitor checks or unchecks a style checkbox THEN the system SHALL show only presets whose `estilo` is one of the checked styles.
3. WHILE checkboxes are checked in both groups, the system SHALL show only presets matching a checked brand AND a checked style.
4. WHILE no checkbox of a group is checked, the system SHALL NOT restrict the list by that group.
5. WHEN the visitor types in the search field THEN the system SHALL show only presets whose `nome`, `equipamento` or `descricao` contains the typed text, ignoring case, accents and surrounding whitespace.
6. WHILE the search field is empty or holds only whitespace, the system SHALL NOT restrict the list by text.
7. WHEN the visitor picks an order THEN the system SHALL list the visible presets newest first, oldest first, or by name A-Z (`pt-BR` collation).
8. WHEN the visitor activates "Aplicar" THEN the system SHALL update the list and SHALL NOT reload the page.
9. WHEN the visitor activates "Limpar" THEN the system SHALL uncheck every filter, empty the search, restore newest-first order and show all presets.

**Independent Test**: Check "Boss", type part of a preset name, switch to "A-Z"; the list changes each time and the URL never changes.

---

### P1: Result count and empty state ⭐ MVP

**User Story**: As a visitor, I want to know how many presets match and to be told clearly when none do so that an empty grid never looks like a broken page.

**Why P1**: The stage requires handling invalid situations; a filter combination with no match is the list's invalid situation.

**Acceptance Criteria**
1. WHEN the list updates THEN the system SHALL announce the number of visible presets in a live region ("1 preset encontrado", "N presets encontrados").
2. IF no preset matches the current filters and search THEN the system SHALL show "Nenhum preset encontrado" and a hint to clear the filters, and SHALL render no cards.
3. WHEN a later change produces matches again THEN the system SHALL remove the empty-state message.

**Independent Test**: Search for "zzzz"; the grid empties and the message appears; clear the search and the cards return.

---

### P1: Custom login and registration validation ⭐ MVP

**User Story**: As a visitor, I want to see what is wrong with each field when I submit so that I can fix my data without guessing.

**Why P1**: The stage explicitly requires form validation and treatment of invalid input.

**Acceptance Criteria**
1. WHEN the visitor submits the registration form THEN the system SHALL reject a name with fewer than 2 characters after trimming, an e-mail not matching the e-mail rule, and a password shorter than 8 characters.
2. WHEN the visitor submits the login form THEN the system SHALL reject an e-mail not matching the e-mail rule and an empty password.
3. IF a field is rejected THEN the system SHALL show that field's message from the "Field messages" assumption next to it, mark it `aria-invalid="true"`, and link the message through `aria-describedby`.
4. IF any field is rejected THEN the system SHALL NOT submit the form and SHALL move focus to the first rejected field.
5. WHEN the visitor edits a rejected field so that it becomes valid THEN the system SHALL remove that field's message and `aria-invalid` without a new submit.
6. WHEN every field is valid on submit THEN the system SHALL NOT reload the page and SHALL show a success message on that face.
7. The system SHALL keep the card flip behaviour of `login-flip-responsive` unchanged.

**Independent Test**: On the registration face submit "R", "ryan@", "123"; three messages appear and focus lands on the name; fix the name and its message disappears while typing.

---

## Edge Cases

- IF the search text contains regular-expression characters such as `(` or `.` THEN the system SHALL treat them as literal text and SHALL NOT throw.
- IF a field contains only whitespace THEN the system SHALL treat it as empty.
- IF the visitor submits an invalid form twice THEN the system SHALL show each message once, not duplicated.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAT-01 | P1: Preset catalogue rendered from data | Tasks | Verified |
| CAT-02 | P1: Preset catalogue rendered from data | Tasks | Verified |
| CAT-03 | P1: Preset catalogue rendered from data | Tasks | Verified |
| CAT-04 | P1: Preset catalogue rendered from data | Tasks | Verified |
| CAT-05 | P1: Preset catalogue rendered from data | Tasks | Verified |
| FILT-01 | P1: Filter, search and sort | Tasks | Verified |
| FILT-02 | P1: Filter, search and sort | Tasks | Verified |
| FILT-03 | P1: Filter, search and sort | Tasks | Verified |
| FILT-04 | P1: Filter, search and sort | Tasks | Verified |
| FILT-05 | P1: Filter, search and sort | Tasks | Verified |
| FILT-06 | P1: Filter, search and sort | Tasks | Verified |
| FILT-07 | P1: Filter, search and sort | Tasks | Verified |
| FILT-08 | P1: Filter, search and sort | Tasks | Verified |
| FILT-09 | P1: Filter, search and sort | Tasks | Verified |
| EMPTY-01 | P1: Result count and empty state | Tasks | Verified |
| EMPTY-02 | P1: Result count and empty state | Tasks | Verified |
| EMPTY-03 | P1: Result count and empty state | Tasks | Verified |
| VAL-01 | P1: Custom login and registration validation | Tasks | Verified |
| VAL-02 | P1: Custom login and registration validation | Tasks | Verified |
| VAL-03 | P1: Custom login and registration validation | Tasks | Verified |
| VAL-04 | P1: Custom login and registration validation | Tasks | Verified |
| VAL-05 | P1: Custom login and registration validation | Tasks | Verified |
| VAL-06 | P1: Custom login and registration validation | Tasks | Verified |
| VAL-07 | P1: Custom login and registration validation | Tasks | Verified |
| EDGE-01 | Edge cases | Tasks | Verified |
| EDGE-02 | Edge cases | Tasks | Verified |
| EDGE-03 | Edge cases | Tasks | Verified |

**ID format:** `[CATEGORY]-[NUMBER]`. `EDGE-*` here is scoped to this feature and unrelated to `login-flip-responsive`'s EDGE IDs.

**Status values:** Pending -> In Design -> In Tasks -> Implementing -> Verified

**Coverage:** 27 total, 27 mapped to tasks (see `tasks.md`), 0 unmapped

---

## Success Criteria

- [ ] Every item of `docs/Requisitos_Etapa04/requisitos.md` points to at least one requirement above (see the mapping in `tasks.md`).
- [ ] The preset list never reloads the page while filtering, searching, sorting, applying or clearing.
- [ ] A filter combination with no match shows the empty-state message, never a silent blank grid.
- [ ] No invalid login or registration submit leaves the page, and every rejected field names its problem.
- [ ] The existing 22+ Playwright tests keep passing.
