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
