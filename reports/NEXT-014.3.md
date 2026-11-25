# NEXT-014.3 — Campaign story / guide lines

## Facts
- Map stage lines: `locale_ui_guide_{mapId}` (ToUILocale prefix `locale_ui_` + InfoKey `guide_*`).
- 62 campaign maps have guide text; RU preferred from `localization/ru.json`.
- GuideNPCDialog: 109 entries (95 with text); GuideStep: 124 (exported for later wiring).
- StoryChapter locale pack: 83 titles/contents (event story; AdventureChapter.Name still empty).

## Delivered
- `tools/export_campaign_story.py` → `next-server/data/campaign-story.json`
- API maps include `hasGuide`/`guide`; `story.chapters` + stats
- Campaign UI: «Сюжет» tab + pre-fight StoryDialog
- 82/82 tests; live smoke guide 100101 = «А-а-а!!»

## Open
- Full GuideStep→dialog sequencing / NPC portraits
- RU StoryChapter titles (still EN in locale packs)
- Tutorial finger hints / auto-play chain
