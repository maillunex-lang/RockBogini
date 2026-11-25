# NEXT-016.4 — Hero job change / reset

## Delivered
- Export `HeroJob` + per-hero job trees (`hero-job.json`, `hero-jobs-by-hero.json`)
- `heroJob.ts`: tree, conditions (★12 roots), materials, roots
- `POST /v1/heroes/:sid/job` `{index}` — unlock (pay materials) or switch active Job
- `POST /v1/heroes/:sid/job/reset` — refund non-root branches, keep roots
- HeroesScreen: job list unlock/select + branch reset
- Enrich: `jobs[]`, `Job`, `JobMap`

## Verification
- heroes tests 6/6 in API container
- Live https://rikagro.ru/testtest/

## Open
- Luck skills / awakening
- Job skill application in combat attrs
- Manual fodder multi-select UI
