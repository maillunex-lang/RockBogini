# Cursor handoff — RockBogini Next

Обновлено: 2026-11-26

## SINGLE-PROJECT-001
Только `/home/gamedev/rocbogini/`. Live: https://rikagro.ru/testtest/.

## Сейчас
**NEXT-026.1/026.2**. City mobile HUD QA passed, animation and original 1:1 comparison open. Original HeroListPanel background and four-column list published; next restore original card/filters/detail, then campaign window or NEXT-021.

## Сделано
- 026.1 city scroll stage + biaoti/baitian Spine
- 020.1 tasks API + City «Задания»
- 019.1–019.4 idle/quick/rewards/shops+VIP
- 018.1–018.6 summon + displace

## Далее
- 026.x визуал окон (campaign → heroes → inventory → summon → shop → tasks)
- 020.2+ / 021 PvE · 023 события

## 2026-11-26 additional handoff
- Current published preview: https://rikagro.ru/sexyidle/ (separate from /testtest/).
- City QA: tools/verify-city-mobile.cjs + reports/NEXT-026.1-026.2-2026-11-26.md.
- Avoid separate canvas CitySpine re-enablement due flicker; do not replace original assets with approximate art.
- GitHub origin credentials missing, remote push/CI not confirmed.

2026-11-26 NEXT-026.2: HeroList original card backgrounds+borders and ElementType-based filter, sort and view toggle live. Full original HeroDetailPanel, button sprites, visual reference QA still open. See reports/NEXT-026.2-hero-original-cards-2026-11-26.md.

NEXT-026.2 HeroDetailPanel: original prefab mapped (Background 928x1358, four BaseAttrItem 618x64, ScrollView 880x786). Existing original UI assets installed in detail. Need resolve external UUID 269yyAZp9El7jeXeC1pkD0 for exact background, then Spine and viewport 1:1. Report reports/NEXT-026.2-herodetail-2026-11-26.md.

NEXT-026.2 five stages 2026-11-26. Original PanelBg1 resolved via CommonBg UUID a30KETdxZHCqBJWvCBI4lU, displayed with 120px 9-slice. Detail 4 anchors and 4-viewport E2E pass. Continue original HeroDetailPanel Spine/controls/layout. Report reports/NEXT-026.2-5-stage-2026-11-26.md.

NEXT-026.3.01–20 source-driven visual batch finished 2026-11-26. Five bundles, 21 original images, 5 screens, 10/10 browser smoke PASS. See reports/NEXT-026.3-20-stages.md and tools/verify-next026-20.cjs. The 20 items are targeted slices of NEXT-026, not twenty completed primary roadmap phases. Continue side-by-side original geometry and Spine visual acceptance; preserve game state.

2026-11-27 NEXT-026.4 partial: HeroSpinePreview.tsx mounts original skeleton lazily via spineLibrary; maps through hero-asset-map.json. 1135 skill-icons copied by tools/extract-hero-skill-icons.py; full source manifest in reports/NEXT-026.4-skill-icons.json. Fullscreen detail and server-only star preview. Continue NEXT-026.4 remaining 20-task scope, visually compare original HeroDetailPanel, do not declare full 1:1. reports/NEXT-026.4-2026-11-27.md.

CI repair 2026-11-27: .github/workflows/ci.yml npm test sets one fresh NEXT_RECOVERY_SECRET using openssl rand -hex 32; never hardcode/print/reuse prod. Confirm remote Actions after push. 90 non-DB tests pass, 53 integration tests skipped without isolated DB. reports/NEXT-026.4-ci-fix-2026-11-27.md.

NEXT-026.4 equipment: regular/holy gear slot art linked to original public/item-icons IDs; 8 icons verified 320/390; existing handlers unaffected. No 1:1 acceptance. reports/NEXT-026.4-original-equipment-2026-11-27.md.

NEXT-026.4 FormationScreen: original assets copied by tools/extract-formation-sprites.py from BattleFormationPanel native/ and packed import sprite rects. Hero roster formation config still authoritative (nine positions). QA three mobile/tablet widths PASS. Do not claim original position 1:1; compare prefab HeroContainer 1084x740 and FormationContainer. reports/NEXT-026.4-formation-2026-11-27.md.

NEXT-026.4 ResultScreen now pulls original ItemIcon and hero avatar images by server IDs. Original SettlementPanel pack has WinPanel/FailPanel prefab and dataBottom/linesBottom sprites; exact mapping not yet transferred. Need full battle playback to visually QA result. reports/NEXT-026.4-result-original-icons-2026-11-27.md.

2026-11-27 urgent summon fix: next-server/src/summon.ts now calls getHeroes before grantHeroCard in common/oracle/crystal; getHeroes bootstrap preserves previously granted heroes even if sid1001 was claimed before hero_collections. Regression next-server/test/summon.test.ts; isolated postgres/redis 11/11. Live browser guests 390/320 free pulls PASS. Original Common card results in SummonScreen. Report reports/NEXT-026.4-summon-real-pull-2026-11-27.md.

Full integration suite caveat: 2026-11-27 independent PG+Redis run with --test-concurrency=3 exceeded 220s, PostgreSQL 40P01 deadlocks in auth and heroes. Do not mark DB tests green. Targeted summon 11/11 PASS. Build isolated serialized CI DB suite next; report reports/NEXT-026.4-integration-suite-audit-2026-11-27.md.

2026-11-27: isolated PostgreSQL 16/Redis 7 sequential integration suite: 144 PASS, 0 FAIL, 0 SKIP, 37.278 seconds, Termalin job 8j4mmuos8w exit 0. Added integration-db GitHub Actions job; remote run pending.

2026-11-27 PRIORITY CHANGE: game mechanics first, freeze cosmetic NEXT-026 until functional parity gates. 13 original handler/port categories in reports/NEXT-MECHANICS-2026-11-27.md. NEXT-015.3 source config extraction tools/export-original-item-piece.py (523 rows, 218 valid SubType1 hero recipes), server inventory compose and compose-all transactions, client inventoried recipe; targeted PG/Redis tests 5/5, browser mocked UI 3/3. NEXT-015.4 RandomBox/LockedBox exact source behavior then story achievements/PvE/PvP. Project path /home/gamedev/rocbogini, preview /sexyidle; no parallel codebases or original-game mutations.

2026-11-27 NEXT-015.3 full server regression in ephemeral isolated PostgreSQL/Redis: 146/146 PASS, 0 fail/skip, 38.074s, Termalin job rftridjsn1 exit 0. Release prod compose and compose-all with server authorization 401 unauthenticated; browser mocked UI 3/3 PASS.

2026-11-27 NEXT-015.4 original locked/random boxes: source tables ItemConsume 1898/CardSummonType 611/CardRandomLib 699, four types 158+363+3+2; 19 missing source refs globally but none active for these boxes; transactional API + client and isolated PostgreSQL/Redis 149/149 PASS; reports/NEXT-015.4-original-boxes-2026-11-27.md. Next: NEXT-020.2 achievements.

2026-11-27 NEXT-015.4 /sexyidle/ published, API /ready true and HTTP200; browser UI mocked API at 320/390/768 PASS, isolated server QA 149/149 PASS, before-deploy PostgreSQL backup /var/backups/rockbogini-next-pre-boxes-20261127.dump. GitHub CI pending.
