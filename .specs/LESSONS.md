# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

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

### L-003 - A locale-collation requirement needs sample data whose order differs between code-point and locale comparison.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tests` · harmful: 0
- features: etapa04-interatividade
- evidence: FILT-07 / M12 (tests)
- last seen: 2026-09-27T15:34:56Z

### L-004 - If a requirement names the message language, either assert a language marker or drop the language from the AC.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: etapa04-interatividade
- evidence: VAL-03 / V19 (spec)
- last seen: 2026-09-27T15:34:56Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
