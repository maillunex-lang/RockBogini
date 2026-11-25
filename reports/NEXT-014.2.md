# NEXT-014.2 — MapWorld campaign map

## Scope
World map UX using original MapWorld positions/owningMap + locale names.

## Facts
- 30 MapWorld entries; names from `localization/en.json` (`MapWorld_name_1..30`). RU place names not yet in locale packs (still EN text).
- `AdventureChapter.Name` empty in config; `AdventureChapter_name_*` absent from locale export — chapter UI keeps «Глава N» + world name context.
- Original WorldMapPanel: mask/check by place progress; labels via `MapWorld_name_{id}`.

## Delivered
- `data/campaign-locales.json`, `campaignLocales.ts`, `worldStatus`/`currentWorldId`
- CampaignScreen worlds/chapters toggle, sheet nav by owningMap, positioned nodes
- Tests 81/81; live smoke worlds[0]=Town of Porte

## Open
StoryChapter dialogue, tutorial, RU toponyms, boss polish.
