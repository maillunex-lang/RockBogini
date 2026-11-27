# NEXT-026.4 broader server integration audit
Date: 2026-11-27.

- Production GitHub Actions at 95b02b5 is green, but its non-DB test run skips DB-dependent cases because CI has no test PostgreSQL service. This does not establish full integration correctness.
- Separate ephemeral PostgreSQL 16 and Redis 7 containers on the isolated RockBogini Docker network, not the production DB, passed all 11 tests in next-server/test/summon.test.ts with PGHOST present. New SID conflict regression passed.
- Attempted complete next-server suite with database-enabled NODE test runner concurrency 3. This run exceeded 220s and did not produce a complete final test count. Two failures were observed before interruption:
  1. auth.test.ts guest session persisted and revocable, PostgreSQL 40P01 deadlock detected.
  2. heroes.test.ts luck study/clear at star 11, PostgreSQL 40P01 during migrate.
- Remaining 142 cases of the DB-enabled complete run cannot be marked passed. Test runner and both disposable PostgreSQL and Redis containers were stopped; production API readiness remained HTTP200.
- Interpretation: concurrent schema migrations / integration tests sharing an ephemeral database need controlled serial execution or isolated per-file DB/schema. Do not infer gameplay failure from the test harness's concurrency, but investigate before claiming full 144/144.
- Next: establish separate integration test CI job with isolated PostgreSQL+Redis and serialized migration/test scheduling. Preserve production DB/data and existing green non-DB CI.
