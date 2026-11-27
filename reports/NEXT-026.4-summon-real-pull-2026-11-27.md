# NEXT-026.4 original summon results + summon initialization repair
Date: 2026-11-27. Checkout /home/gamedev/rocbogini. Live test https://rikagro.ru/sexyidle/.

## Original source
- SummonHeroPanel original Cocos asset pack contains DailySummonResultPanel prefab; previous NEXT-026.3 imported four original summon control sprites.
- Reused exact original 218x318 card_bg_N/card_border_N sprites from Common atlas and exact original profile/icon-{HeroId}.webp. ElementType read from existing original Hero catalog. Summoned hero IDs, card IDs, stars, and quantities come from server responses, not client generation.
- The result dialog is functional but original DailySummonResultPanel exact sizing, transition animation, and prefab parity are not yet accepted 1:1.

## Root cause of live defect and fix
- Actual browser free summon POST /v1/summon/pull returned PostgreSQL 23505 duplicate key on player_heroes_pkey.
- PostgreSQL logs confirmed sid=1001 collision, and read-only query found 3 accounts with player_heroes but without hero_collections.
- Root cause: old summon routes granted heroes first, then called getHeroes for collection initialization. Summoned character received sid=1001; starter initializer attempted to insert starter sid=1001 afterward.
- All three summon POST routes now initialize the hero collection before allocation. getHeroes bootstrapping preserves preexisting summons on old partially initialized accounts and assigns colliding starters unused SIDs, leaving saved heroes intact.
- No mass DB mutation or deletes. Pre-deploy root-only PostgreSQL pg_dump at /var/backups/rockbogini-next-before-summon-fix-20261127.dump; previous server JS modules backed up next to it. API code hotpatched into existing container preserving running credentials and restarted; additionally rebuilt rockbogini-next-api:latest from canonical source for future deployment.

## Verification
- TypeScript build of server and Vite client PASS.
- Non-DB isolated test run: 144 total, 90 passed, 0 failed, 54 intentionally skipped without PGHOST.
- Separate ephemeral PostgreSQL and Redis containers (not live DB): next-server/test/summon.test.js 11/11 PASS including new old-account orphan SID conflict regression. Containers stopped after test.
- Real live browser guest -> city -> summon -> free x1 -> result dialog at 390x844 and 320x640: both PASS. Each returned 1 server-confirmed hero, exact card frame and portrait loaded, no horizontal overflow/HTTP>=400/JS errors, close result works.
- API readiness true and game page HTTP200.

## Open
Exact original summon reveal animation, HeroDetail/city battle all 1:1, concurrent overlapping summon transaction isolation, remote GitHub CI for this commit, and other originally proposed 20 features not accepted. Existing operational games unaffected.
