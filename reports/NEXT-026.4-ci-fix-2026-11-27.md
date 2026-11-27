# NEXT-026.4 CI repair, 2026-11-27
Previously GitHub Actions run 45876319647: pixi-client success, next-server failure. All 24 failed test files threw during module import because next-server/src/recovery.ts requires NEXT_RECOVERY_SECRET length>=32; the workflow invoked npm test without any secret.
Changed .github/workflows/ci.yml: next-server npm test uses NEXT_RECOVERY_SECRET generated freshly per run by openssl rand -hex 32. Production guard stays intact, no secret hardcoded/committed/printed.
Isolated local test command with PGHOST and other DB auth env vars unset, ephemeral secret: 143 tests, 90 pass, 0 fail, 53 skip (DB integration tests cannot run without isolated test DB). Exit 0. This verifies only non-DB test suite. Vite/tsc client PASS.
Also HeroSpinePreview now halts/resumes its 30fps Pixi ticker when browser tab visibility changes, in addition to IntersectionObserver visibility. This supports 6GB Android minimum goal.
This report does NOT imply remote Actions or integration DB suite is green; verify after push.
