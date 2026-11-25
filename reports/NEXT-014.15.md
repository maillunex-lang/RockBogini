# NEXT-014.15 — Finger-hint overlays + plot video

## Delivered
- Plot: `pixi-client/public/guide/GuidePlot_EN.mp4` + `PlotVideoPlayer` (group 1)
- Finger: `FingerHintOverlay` (dim + hole + pulse finger) for guide groups with Type=2 steps
- API: `playableTutorial` → `hasFinger`, `hints[]` (`targetKey`, size/offset), `plotVideoUrl`
- Stop silent auto-skip of finger-only groups
- Curated `guideTargets.ts` stepId → `data-guide` (city dock / campaign map / close)
- City + Campaign anchors: `city-nav-*`, `city-summon`, `city-bag`, `campaign-map-available`, `campaign-close`

## Verification
- campaignRoutes 11/11 in API container
- Live https://rikagro.ru/testtest/ (+ `/guide/GuidePlot_EN.mp4`)

## Open
- Full formation-slot / bag / hang-up panel mirroring
- Spine finger asset (CSS finger for MVP)
- Displace / activity summons (018.5+)
