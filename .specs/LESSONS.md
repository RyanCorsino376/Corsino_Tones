# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-003 - A locale-collation requirement needs sample data whose order differs between code-point and locale comparison.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `tests` · harmful: 0
- features: etapa04-interatividade, etapa05-packs
- evidence: FILT-07 / M12 (tests) (+1 more)
- last seen: 2026-11-06T19:23:49Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Assert pluralized count text at zero as well as at one and many; zero is where singular/plural bugs hide.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: etapa04-interatividade
- evidence: M14 frontend/presets.js:54 (tests)
- last seen: 2026-09-27T15:34:56Z

### L-002 - When a spec fixes an anchored regex, include a rejection sample that embeds a valid match inside invalid text.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: etapa04-interatividade
- evidence: V02 frontend/login.js:42 (tests) (+1 more)
- last seen: 2026-09-27T16:00:23Z

### L-004 - If a requirement names the message language, either assert a language marker or drop the language from the AC.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: etapa04-interatividade
- evidence: VAL-03 / V19 (spec)
- last seen: 2026-09-27T15:34:56Z

### L-005 - When a criterion places an element inside a region, name the container in the spec and scope the test locator to it
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `frontend-ui` · harmful: 0
- features: etapa05-api-modulos
- evidence: LOAD-02 tests/carga-estado.spec.js:177 (frontend-ui)
- last seen: 2026-11-05T17:28:37Z

### L-006 - Test exact-match secrets with a case-variant input, not only a value differing in another character
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: etapa05-auth
- evidence: M02 frontend/servicos/auth.js:31 (auth)
- last seen: 2026-11-05T18:35:42Z

### L-007 - When the spec requires location.replace, assert history.length or back-navigation, not just the final URL
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `navigation` · harmful: 0
- features: etapa05-auth
- evidence: M13 frontend/paginas/login.js:140 (navigation)
- last seen: 2026-11-05T18:35:42Z

### L-008 - State the navigation method for user-initiated navigations separately from automatic redirects
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: etapa05-auth
- evidence: SES-04 frontend/ui/cabecalho.js:24 (spec)
- last seen: 2026-11-05T18:35:42Z

### L-009 - When a spec says a page must not navigate by itself, assert the URL after a wait or record navigations, not only at one instant
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `navigation` · harmful: 0
- features: etapa05-auth
- evidence: P07 frontend/paginas/biblioteca.js:10 (PROT-01) (navigation)
- last seen: 2026-11-05T18:55:35Z

### L-010 - A fake clock only drives JS timers; to prove a page never navigates by itself, also assert no meta refresh exists or wait real time
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: etapa05-auth
- evidence: P07e frontend/paginas/biblioteca.js:10 (tests)
- last seen: 2026-11-05T19:12:37Z

### L-011 - When a criterion says any element of a kind, assert it on at least two instances in different containers.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: etapa05-packs
- evidence: M22 frontend/style.css:536 (FIX-02) (tests)
- last seen: 2026-11-06T19:23:49Z

### L-012 - When a spec revision changes a domain definition, re-check documentation criteria against the new wording, not only keyword presence.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: etapa05-packs
- evidence: FIX-03 README.md:4 (spec)
- last seen: 2026-11-06T19:23:49Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
