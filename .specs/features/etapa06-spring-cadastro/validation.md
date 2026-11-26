# etapa06-spring-cadastro Validation

**Date**: 2026-11-18
**Spec**: `.specs/features/etapa06-spring-cadastro/spec.md`
**Diff range**: f3bfc53..HEAD (HEAD 0924e97), code under `backend/src`
**Verifier**: independent sub-agent (author != verifier)
**Verdict**: PASS (30/30 ACs with file:line evidence; 4 spec-precision gaps flagged; 4 of 46 sensor mutants survived, 3 equivalent and 1 non-AC design gap, see below)

---

## Task Completion

All 19 tasks (T1-T19) present in tasks.md and implemented in the diff; no blocked or partial work found.

---

## Spec-Anchored Acceptance Criteria

Test paths are under `backend/src/test/java/com/corsinotones/`.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| SRV-01 build + tests pass | `./mvnw test` green on JDK 21 | Gate run: 73 passed, 0 failed (`BackendApplicationTest.java:19` context loads) | PASS |
| SRV-02 listens on 8081 | port 8081 | `BackendApplicationTest.java:19` `assertThat(environment.getProperty("server.port")).isEqualTo("8081")`; mutant 8081->8080 killed | PASS, spec-precision gap (property only, no socket check) |
| SRV-03 package split, controller depends on services/DTOs only | 5 packages; controller does not touch repository | `controller/AuthControllerCadastroTest.java:141` `Package.getPackage(...).isNotNull()`, `:145` and `:148` `getPackageName().isNotEqualTo("com.corsinotones.repository")` | PASS, spec-precision gap (structure test; does not assert "only repository touches stored users", no ArchUnit) |
| SRV-04 CORS preflight for 8080/5173, others denied | allow-origin echo; other origins not allowed | `config/SegurancaConfigTest.java:33` `header().string("Access-Control-Allow-Origin","http://localhost:8080")`; `:40` same for 5173 login; `:46-47` evil origin `isForbidden()` + no header; `:53-54` localhost:3000 forbidden | PASS |
| SRV-05 single error body, no stack trace | `{status,mensagem,campos}`; no trace | `controller/ErroHandlerTest.java:32` (400 + `$.status` 400), `:69-72` (500 "Erro interno do servidor.", body has no "segredo" or "at com."), `:79-81` (404), `:88-90` (405), `:96-98` all three keys exist | PASS |
| CAD-01 201 `{id,nome,email}` trimmed + lower-cased | 201; nome "Ana Souza"; email lower-case | `controller/AuthControllerCadastroTest.java:53` `isCreated()`, `:57` `$.nome` = "Ana Souza", `:58` `$.email` = lower email, `:59` `$.*` hasSize(3) | PASS |
| CAD-02 no password/hash in response or logs | absent | `AuthControllerCadastroTest.java:60-61` body lacks "senha" and "$2"; `:134` `saida.getAll()` lacks the password, "$2a$", "$2b$"; mutants M40 (log password) killed | PASS |
| CAD-03 BCrypt hash stored, not plain | hash matches, != plain | `service/AuthServiceTest.java:40` `isNotEqualTo("senha-longa-1")`, `:41` `encoder.matches(...).isTrue()`; M6 (plain stored) killed | PASS |
| CAD-04 name 2..100 -> 400 `campos.nome` | "Informe um nome com 2 a 100 caracteres." | `AuthControllerCadastroTest.java:68` `$.campos.nome` = MSG_NOME; bounds `dto/CadastroRequestTest.java:34-35,40-41` (A, 101 reject; 2, 100 accept); M9/M10 killed | PASS |
| CAD-05 e-mail regex or >254 -> 400 `campos.email` | "Informe um e-mail válido, como nome@exemplo.com." | `AuthControllerCadastroTest.java:76`; `CadastroRequestTest.java:57-59` (a@b, space, 255 chars rejected), `:82` (254 accepted); M13/M14/M15 killed | PASS |
| CAD-06 password 8..72 -> 400 `campos.senha` | "A senha precisa ter de 8 a 72 caracteres." | `AuthControllerCadastroTest.java:84`; `CadastroRequestTest.java:87-88` (7, 73 reject), `:94-95` (8, 72 accept); M11/M12/M18 killed | PASS |
| CAD-07 several invalid fields in one 400 | all fields listed | `AuthControllerCadastroTest.java:92-94` three `$.campos.*` values | PASS |
| CAD-08 missing/null field invalid with rule message | rule message | `AuthControllerCadastroTest.java:101-103` (`{}`) and `:106-108` (nulls) | PASS |
| CAD-09 invalid JSON -> 400 | mensagem "Corpo da requisição inválido.", campos empty | `AuthControllerCadastroTest.java:115-116`; `ErroHandlerTest.java:42-43`; M47/M48 killed | PASS |
| CAD-10 duplicate e-mail (trim + lower-case) -> 409 | "Este e-mail já está cadastrado.", no user created | `AuthControllerCadastroTest.java:125-127`; `AuthServiceTest.java:51-53` (EmailEmUso, original name kept); `UsuarioRepositoryEmMemoriaTest.java:43,47`; M7/M21/M22 killed | PASS |
| CAD-11 id = largest id + 1 | max+1 | `UsuarioRepositoryEmMemoriaTest.java:35` `criado.id()).isEqualTo(6L)` (ids 1 and 5 loaded); `:23`; `SementeUsuariosArquivoTest.java:68` id 8 after 3 and 7; M1 (count+1) and M2 killed | PASS |
| CAD-12 concurrent same e-mail: one 201, other 409 | exactly 1 success | `UsuarioRepositoryEmMemoriaTest.java:76` `sucessos).isEqualTo(1L)`; `AuthServiceTest.java:92`; M3 (synchronized removed) killed in this run | PASS (race-based; M3 detection is probabilistic) |
| LOG-01 login 200 `{token,usuario}` | 200, 2 top-level keys | `controller/AuthControllerLoginTest.java:59-64` `isOk()`, `$.token` string, `$.usuario.*` hasSize(3), `$.*` hasSize(2) | PASS |
| LOG-02 e-mail trimmed + lower-cased | signs in | `AuthControllerLoginTest.java:58` upper-case + spaces then `:59` 200; `AuthServiceTest.java:116-118`; M4, M17 killed | PASS |
| LOG-03 BCrypt check; seed `teste123`; registered password | both sign in | `AuthControllerLoginTest.java:76-79` (ryan/teste123, id 1); `AuthServiceTest.java:105-107`; M6, M34 killed | PASS |
| LOG-04 HS256, sub=id, nome, email, exp=iat+2h | exact claims | `service/TokenServiceTest.java:37-41` (sub "7", nome, email, iat, `plusSeconds(7200)`), `:48` `alg` "HS256"; M24-M28 killed | PASS |
| LOG-05 401 identical for unknown e-mail / wrong password | "E-mail ou senha incorretos.", campos empty | `AuthControllerLoginTest.java:92` bodies equal, `:94-96` status 401, mensagem, campos empty; `AuthServiceTest.java:128,135`; M20/M23 killed | PASS |
| LOG-06 empty/missing e-mail or password -> 400 | "Informe um e-mail válido, como nome@exemplo.com." / "Informe sua senha." | `AuthControllerLoginTest.java:103-104,111-112`; `dto/LoginRequestTest.java:27-29,34-35`; M19 killed | PASS |
| LOG-07 invalid JSON -> 400 | "Corpo da requisição inválido.", campos empty | `AuthControllerLoginTest.java:119-120` | PASS |
| LOG-08 no password/hash in response or logs | absent | `AuthControllerLoginTest.java:130-131` response, `:134-135` logs (password, wrong password, "$2a$", "$2b$"); M41 (log hash) killed | PASS |
| LOG-09 secret missing/<32 fails start naming variable | context fails, message has CORSINO_JWT_SECRET | `config/JwtConfigTest.java:19-20` (empty), `:26-28` blank, `:34-35` 31 chars fails, `:42-43` 32 chars starts; M37 (min 16) killed | PASS, spec-precision gap ("missing" tested as empty because Surefire defines the env var; code treats absent as the empty default) |
| SEED-01 seed loaded with id/nome/email, hashed password | ids 3, 7; BCrypt match | `repository/SementeUsuariosArquivoTest.java:52-57` ids, nome, `senhaHash != plain`, `encoder.matches(...)`; `SementeUsuariosServidorRealTest.java:19` default path loads; M33/M34/M36 killed | PASS |
| SEED-02 ryan -> 409, new e-mail id 2 | 409 + id 2 | `SementeUsuariosPadraoTest.java:33,38` `isConflict()`, `$.id` = 2 | PASS |
| SEED-03 missing seed: no users + warning | first id 1, WARN logged | `SementeUsuariosAusenteTest.java:32` `$.id` = 1, `:34` output contains "WARN" and the path; M35 killed | PASS |
| SEED-04 seed and `mock/db.json` not written | unchanged | `SementeUsuariosArquivoTest.java:70` bytes equal, `:71` mtime equals fixed date, `:73` db.json mtime unchanged | PASS, spec-precision gap (observational: no write-mutant was injected; absence of write code confirmed by reading `SementeUsuarios.java`, which only calls `Files.readAllBytes`) |

**Status**: all 30 ACs covered with exact spec values (status codes and messages match the spec text character for character). 4 spec-precision gaps flagged: SRV-02, SRV-03, LOG-09, SEED-04.

---

## Discrimination Sensor

Run in an isolated git worktree under the scratchpad (removed afterwards). Only the relevant test classes ran per mutant. Paths under `backend/src/main/java/com/corsinotones/`.

| # | File:line | Mutation | Result |
| - | --------- | -------- | ------ |
| M1 | `repository/UsuarioRepositoryEmMemoria.java:26` | id = max+1 -> `porEmail.size()+1` | Killed |
| M2 | same | id = max (no +1) | Killed |
| M3 | `UsuarioRepositoryEmMemoria.java:22` | `synchronized` removed from `criar` | Killed |
| M4 | `service/AuthService.java:33` | no lower-casing | Killed |
| M5 | same | no trim in `normalizarEmail` | SURVIVED (equivalent: both DTOs trim before the service, `CadastroRequest.java:28`, `LoginRequest.java:14`) |
| M6 | `AuthService.java:39` | plain password stored | Killed |
| M7 | `UsuarioRepositoryEmMemoria.java:23` | duplicate check disabled | Killed |
| M8 | `AuthService.java:46` | dummy hash replaced by the invalid string "x" | SURVIVED (see gap 1) |
| M49 | same | `matches` skipped when e-mail unknown | Killed |
| M9, M10 | `dto/CadastroRequest.java:10` | name max 100->101, min 2->1 | Killed, Killed |
| M11, M12 | `CadastroRequest.java:19` | password max 72->73, min 8->7 | Killed, Killed |
| M13, M14 | `CadastroRequest.java:14` | e-mail max 254->255, ->253 | Killed, Killed |
| M15 | `CadastroRequest.java:15` | regex without the dot part | Killed |
| M16, M17 | `CadastroRequest.java:27`, `LoginRequest.java:14` | name not trimmed, login e-mail not trimmed | Killed, Killed |
| M18, M19 | `CadastroRequest.java:24`, `LoginRequest.java:10` | message text changed | Killed, Killed |
| M20, M21 | `controller/ErroHandler.java:45,40` | 401->400, 409->400 | Killed, Killed |
| M22, M23 | `service/EmailEmUso.java:6`, `CredenciaisInvalidas.java:6` | message text changed | Killed, Killed |
| M24-M28 | `service/TokenService.java:17,31-37` | exp 1h; sub=email; nome claim dropped; email claim dropped; alg HS512 | all Killed |
| M29, M30 | `config/SegurancaConfig.java:19` | 5173 origin removed; wildcard origin | Killed, Killed |
| M31 | `SegurancaConfig.java:35` | `OPTIONS` removed from allowed methods | SURVIVED (equivalent: a preflight is answered from `Access-Control-Request-Method: POST`) |
| M33-M36 | `repository/SementeUsuarios.java:44-48` | seed id ignored; plain password stored; warning silenced; e-mail not lower-cased | all Killed |
| M37 | `config/JwtConfig.java:20` | min secret 32->16 | Killed |
| M38 | `src/main/resources/application.properties:2` | port 8081->8080 | Killed |
| M39 | `ErroHandler.java:61` | 500 message leaks `erro.getMessage()` | Killed |
| M40, M41 | `AuthService.java:38,47` | password logged on register, hash logged on login | Killed, Killed |
| M42 | `AuthService.java:47` | failure only when password wrong (unknown e-mail relies on dummy hash mismatch) | SURVIVED (equivalent: the dummy hash never matches a real input) |
| M45 | `controller/AuthController.java:27` | 201 -> 200 | Killed |
| M46 | `AuthService.java:38` | e-mail lower-case dropped on register | Killed |
| M47, M48 | `ErroHandler.java:35` | broken JSON -> 500; non-empty campos | Killed, Killed |

**Sensor depth**: P0 full manual run (auth / data integrity), 46 mutants (M1 re-run after a compile error in the first attempt).
**Result**: 42/46 killed, 4 survived (M5, M31, M42 equivalent; M8 genuine weak-test gap on a design-only requirement, not tied to an AC) - PASS with a non-blocking follow-up.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / no scope creep | OK (only `ErroResposta.semCampos` at `dto/ErroResposta.java:8` looks unused; not verified) |
| Matches patterns / layering | OK (controller -> service -> repository interface) |
| Spec-anchored outcome check | OK (exact messages and status codes asserted) |
| Every test maps to an AC or design item | OK |
| Documented guidelines | none - strong defaults applied |

---

## Edge Cases

- [x] `"  Ryan@Exemplo.com "` collides (`AuthServiceTest.java:50-52`, `AuthControllerCadastroTest.java:124-127`)
- [x] 72 accepted / 73 rejected password (`CadastroRequestTest.java:88,95`)
- [x] Users reset on restart, seed returns (stated behavior, `SementeUsuariosPadraoTest.java`)

---

## Gate Check

- **Gate command**: `cd backend && ./mvnw -q clean test`
- **Result**: 73 passed, 0 failed, 0 skipped
- **Test count before feature**: 0 (backend did not exist)
- **Test count after feature**: 73
- **Delta**: +73

---

## Fix Plans (non-blocking follow-ups, ranked)

1. **Timing guard (M8)**: `AuthServiceTest.java:164-165` only counts `matches` calls. Add an assertion that the dummy hash is a valid BCrypt hash of the same cost, e.g. read it through a recording encoder and check `hash.startsWith("$2")` and that `encoder.matches` returns false without a warning, or compare cost with the real hash.
2. **SRV-02**: add a `RANDOM_PORT` check that the default port property is 8081 end to end (or a test reading `application.properties`) so the socket, not only the property, is asserted. `SementeUsuariosServidorRealTest.java:11` uses a random port.
3. **SRV-03**: add an ArchUnit-style (or reflection) test that only `repository` classes import `Usuario` storage and that `service` does not depend on `controller`.
4. **LOG-09**: add a test that the property is absent (no `corsino.jwt.secret` key at all) using a context runner without the env fallback, or document the equivalence in the spec.
5. **SEED-04**: optionally make the seed file read-only in the test (`setReadOnly()`) so any write attempt would throw.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| SRV-01..05, CAD-01..12, LOG-01..09, SEED-01..04 | Pending | Verified (spec-precision gaps on SRV-02, SRV-03, LOG-09, SEED-04) |

---

## Summary

**Overall**: Ready (PASS)

**Spec-anchored check**: 30/30 ACs matched spec outcome | 4 spec-precision gaps
**Sensor**: 42/46 killed (3 equivalent survivors, 1 design-level survivor M8)
**Gate**: 73 passed

**Next steps**: address follow-ups 1-5 when convenient; none block the feature.
