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
