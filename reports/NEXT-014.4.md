# NEXT-014.4 — GuideGroup tutorial sequencing

## Facts (original GuideManager)
- GuideStep Type[0]: 1=NPCDialog(Type[1]), 2=FingerHint, 3=ShowPanel
- GuideGroup has Steps1/Steps2; CheckGuideStep uses Steps2 for active group
- CompletedGuides advances group index

## Delivered
- Exported 19 GuideGroups + 58 FingerHints into campaign-story.json with resolved sequences
- `player_guide_groups` migration v11
- GET /v1/campaign `tutorial.pending` (auto-skips non-dialog groups until NPC lines)
- POST /v1/campaign/guide/complete
- CampaignScreen shows tutorial StoryDialog
- 83/83 tests; smoke: pending group 31 «Победим врага!»

## Open
- Finger-hint overlays / panel show steps UI
- Plot step Type=100 video
- Boss presentation (014.5), WinBoard
