# Stage 07 Persistence - Context

**Gathered:** 2026-11-24
**Spec:** `.specs/features/etapa07-persistencia/spec.md`
**Status:** Ready for design

---

## Feature Boundary

PostgreSQL behind the Spring API for users, equipments, packs, presets and orders, with Flyway migrations, CRUD endpoints, a development `docker-compose.yml` and the stage 07 delivery document. MinIO, download and deploy are later slices.

---

## Implementation Decisions

### Database

- PostgreSQL. The user chose it; it is also what `docs/proposta.md` and AD-010 named.
- Six tables: `usuario`, `equipamento`, `pack`, `preset`, `pedido`, `item_pedido`.
- Orders buy packs, not presets (`mock/db.json` stores `packIds`).

### Preset files

- The file a buyer imports into their equipment lives in a MinIO bucket; the database keeps only its key in `preset.arquivo_chave`.
- No parameter table: the settings are inside the file, and the user does not want them shown on the site.
- Download flow agreed for the next slice: the server checks the buyer owns the preset's pack in a paid order, then answers a short-lived pre-signed MinIO URL.

### Slice size

- This slice is PostgreSQL only; MinIO and download come next.

### Permissions

- Catalogue reads are public; catalogue writes need `ADMIN`; orders need a signed-in user and each user sees only their own.

### Initial data

- The mock catalogue enters through a Flyway migration (`V2`), not through startup code.

### Tests

- Backend tests use Testcontainers with a real PostgreSQL; Docker must be running.

### Agent's Discretion

- Pack id rule, validation bounds, error messages, delete rules, JSON field names and connection variables (all logged as assumptions in the spec).

### Declined / Undiscussed Gray Areas → Assumptions

- Admin assignment, order status on creation, repeat purchases and the `docs/proposta.md` update are logged in the spec's Assumptions table with `Confirmed? n`.

---

## Specific References

- `mock/db.seed.json` is the source of the initial catalogue.
- The JSON shapes match the mock so the legacy front end later changes only its base URL (AD-012).

---

## Deferred Ideas

- MinIO bucket, preset upload and `GET /presets/{id}/download` with pre-signed URLs.
- Docker image of the app and a deploy compose with app, PostgreSQL and MinIO.
- Comments and favourites from `docs/proposta.md`.
- Switching the front end's catalogue and orders from json-server to Spring.
