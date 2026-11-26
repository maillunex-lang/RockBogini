# NEXT-020.1 — Daily/weekly tasks

## Delivered
- Config: TaskBase daily/weekly (21) + TaskPointReward + PointRewardType → `tasks.json`
- Migration 22: `player_tasks`, `player_task_meta` (daily/weekly reset + point chests)
- API: GET `/v1/tasks`, POST `/v1/tasks/claim`, POST `/v1/tasks/points`
- Events: login (on tasks open), hang-up claim, quick battle, shop buy (shopId param), summon pull
- City «Задания» → TasksScreen (daily/weekly tabs, claim all, point chests)
- Date handling: local calendar day for shop/idle/tasks (fixes UTC+offset daily reset)

## Verification
- tasks + shop + quickBattle + storage tests green
- Live https://rikagro.ru/testtest/

## Open
- Story/achievement task types beyond daily/weekly
- More condition hooks (campaign fight, hero upgrade, energy) still need wiring
- Achievement point tracks (types 4/9/16) deferred
