# NEXT-026.1 mobile HUD QA / NEXT-026.2 hero-list visual baseline
Date: 2026-11-26
Codebase: /home/gamedev/rocbogini, PixiJS 7.4.3 / Spine 3.8 client; isolated public Next preview: https://rikagro.ru/sexyidle/

## Verified / delivered
- Original MainSceneBg day texture, nine original English image labels, HUD original currency icons, original bitmap battle power numbers, profile XP progress based on exported original PlayerLevel thresholds already in the live build.
- Fixed visible shortcut text interfering with bag/tasks; added accessible aria labels to all six buttons.
- Added reproducible browser smoke tool tools/verify-city-mobile.cjs. Run:
  PLAYWRIGHT_MODULE=/tmp/rock-pixi8-bench/node_modules/playwright node tools/verify-city-mobile.cjs
  with CITY_URL override when needed. Requires installed Chromium in the invoking user's browser cache.
- PASS at 320x640, 360x640, 390x844, 768x1024: 9 labels, 5 dock buttons, XP progressbar, six accessible shortcut names, scrollable city, zero overlapping shortcut hitboxes, zero broken city img tags, zero page exceptions or HTTP4xx/5xx.
- NEXT-026.2 first visual slice: original HeroListPanel/Bg source texture (1080x2520, Cocos original path HeroListPanel/native/47/477e4ffc-9f88-48c7-a171-f2ddca111002.ca6d4.webp) installed at public/heroes/original/HeroListBg.webp. Four-column hero card layout; visual page smoke: 320x640/390x844/768x1024, three starter heroes, no horizontal body overflow and no browser errors.
- Vite production build and rsync publication succeeded. No changes to API/DB/Elixir/other games.

## Open, not accepted
- City 1:1 graphical parity has NOT been accepted by owner; city entrance positioning and original camera/scroll hierarchy need side-by-side original screenshots.
- Original city Spine biaoti/baitian is OFF: previous separate-canvas WebGL approach flickered. Do not re-enable before integrated single-renderer QA; no animation progress asserted here.
- HeroList original card frames, panels, filters, character display/details, other screen imagery and visual comparison still pending.
- GitHub origin push/CI were previously blocked by absent HTTPS credentials. Local commit != remote CI green.
- City shortcut mail/friends/rank/chat remain unavailable until later social stage NEXT-022.
