# NEXT-026.2 Hero List: original cards and functional controls
Date 2026-11-26, codebase /home/gamedev/rocbogini, deployed preview https://rikagro.ru/sexyidle/

Source of original sprites:
assets/Common/import/07/079ec717e.002f6.json
assets/Common/native/70/7001a173-9bd7-43c1-8332-df237e0f51f0.a47a4.webp
- 20 exact original card backgrounds and borders were cropped from Cocos sprite atlas into pixi-client/public/heroes/original/cards (6 element pairs + chaos/lr/ur/lrPlus).
- 354 entries of ElementType and StarLevel derived directly from next-server/src/heroCatalog.ts to pixi-client/src/heroes/heroVisualCatalog.json. Element determines original card background+border; NO unsupported rarity mapping has been invented.
- HeroListPanel prefab examined: HeroContainer 1080x1382, HeroElementGroup 735x100, ItemScrollView/CardScrollView 1030x1200, four 184x104 element toggles, FormationBtn and sort/switch controls. Reconstructed the corresponding functional UI in existing HeroesScreen, maintaining all existing hero growth and equipment behavior.
- Added switch between original card and compact portrait view, sort by power/level/star, filter by original element type (0 all, 1–6), and accessible selected card state.
- Published successful Vite build to /sexyidle/. Browser checked at 320x640, 390x844, 768x1024: 3 starter cards, 4-column layout, original images loaded, filter result, select sort, toggle view, click hero and open existing detail; zero page errors, HTTP errors and horizontal document overflow.
- Existing server, database, original Elixir game, other games untouched.

Next acceptance work before claiming full 1:1: HeroListPanel button exact graphics and size/placement, character full-body previews and detail panel from original HeroDetailPanel, visual reference side-by-side, locale graphic sprites, detailed UX and Android on-device QA. Story/combat etc not changed here.
