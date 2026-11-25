# Cursor handoff — RockBogini Next

Обновлено: 2026-11-25

## Сейчас
Активная задача: **NEXT-014.1** (partial). NEXT-013 закрыт по **D-011** (визуальная приёмка владельцем).

Прочитать AGENTS.md, docs/ROADMAP.md, roadmap.json, STATUS.md, DECISIONS.md, WORKLOG.md. Эталон только для чтения. Работать в /home/gamedev/rocbogini. GitHub RockBogini — через /home/gamedev/rockbogini-publish.

## Сделано в этом срезе
- AdventureChapter/MapWorld export → next-audit/campaign-chapters.json + next-server/data/campaign-chapters.json (56 глав, 30 миров, 2240 карт в главах, orphan map 105701).
- GET /v1/campaign (auth): stage/level, chapter summaries, maps for focus chapter, canChallenge.
- CampaignScreen + City «Кампания»; ReportScreen принимает mapId.
- 77/77 server tests; API deployed; https://rikagro.ru/testtest/ published.

## Далее
- NEXT-014.2+: world map / MapWorld UI, сюжетные тексты StoryChapter, обучение, имена глав из локалей (AdventureChapter_name_*), orphan 105701 policy, boss presentation.
- Известные остатки боя 013.8 не блокируют, но не забывать: angel actors, 10 ActionIndex, multi-texture VFX, 64 sounds, autoplay, WinBoard art.

## Критерии
Не отмечать NEXT-014 done без глав/этапов/наград/обучения по roadmap. Не изобретать ID/баланс. Не трогать другие проекты.
