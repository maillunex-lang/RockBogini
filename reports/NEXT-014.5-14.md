# NEXT-014.5–014.14 — campaign depth batch (10 stages)

## Stages delivered

| Stage | Focus | Result |
|---|---|---|
| 014.5 | Boss presentation (`MapAdventure.Type==2`) | `boss`/`mapType` on maps; boss tiles styled; settlement `boss` |
| 014.6 | Enemy preview | `enemies[]` + `enemyCount` from map meta on campaign API + preview aside |
| 014.7 | Reward preview | map rewards in preview with `itemDisplayName` |
| 014.8 | Module unlock names | `moduleNames.ts` + ResultScreen `unlockedModules` |
| 014.9 | WinBoard art | `settlement-winboard.webp` + ResultScreen winboard band |
| 014.10 | Campaign complete | `campaignComplete` on GET /v1/campaign + settle; banner + result copy |
| 014.11 | Chapter heros | `heros` restored in `campaign-chapters.json`; `focusChapterHeros` API/UI |
| 014.12 | Stage index/labels | `stageLabel`/`stageIndex`/`stageCount` (e.g. `1-5`) |
| 014.13 | Tutorial skip | «Пропустить обучение» advances pending guide groups |
| 014.14 | Item names + UI polish | `itemNames.ts`; preview after guide dialog; map meta stats |

## Data

- `next-server/data/campaign-map-meta.json` — 2241 maps, 449 bosses, 284 modules
- Source: MapAdventure Type 1=Normal / 2=Boss (IdleBattleMainPanel)

## API

- Maps enriched: boss, mapType, stageLabel, stageIndex, stageCount, enemies, enemyCount, bg, maxRounds, terminal
- `mapMetaStats`, `focusChapterHeros`, `campaignComplete`
- Settle adds `boss`, `stageLabel`, `campaignComplete`

## Client

- CampaignScreen: boss tiles, stage labels, enemy/reward preview, chapter heros, skip tutorial, complete banner
- ResultScreen + `resultScreen.css`: WinBoard, modules, complete state

## Verification

- Server tests: 84/84 (`reports/NEXT-014.5-14-server-tests.log`)
- Client `tsc --noEmit` ok
- API smoke: boss 100105 `1-5` Type=2, enemies≥1 (`reports/NEXT-014.5-14-api-smoke.json`)
- Deploy: `reports/NEXT-014.5-14-api-deploy.log`
- Publish: https://rikagro.ru/testtest/ + winboard 200 (`reports/NEXT-014.5-14-publish.log`)

## Open (not blocking)

- Finger-hint / panel overlay UI (GuideStep Type 2/3)
- Plot video step (Type=100)
- Full RU StoryChapter titles where locale still EN
