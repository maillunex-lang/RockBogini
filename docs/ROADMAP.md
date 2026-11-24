# RockBogini Next — утверждённая генеральная дорожная карта

VPS only; GitHub deferred. Original game and Elixir unchanged until separate cutover approval. Vertical slices: reference → server → parity → UI/assets → integration → tests → visual QA → documentation. Old roadmap: archive/ROADMAP-before-next.md.

| ID | Этап | Статус | Объём | Доказательство |
|---|---|---|---|---|
| NEXT-001 | Архитектура клиента | done | PixiJS 7, Spine 3.8, React, TypeScript, сборка | reports/PIXI-01-build.log |
| NEXT-002 | Архитектура сервера | done | Fastify, REST, WebSocket, тесты | reports/SERVER-01-test.log |
| NEXT-003 | Полный аудит оригинала | done | Реестр экранов, протоколов, конфигураций, формул, зависимостей и тестов | reports/NEXT-003-inventory.json; reports/NEXT-003-mapping.json; reports/NEXT-003-findings.md; reports/NEXT-003-baseline.log; reports/NEXT-003-fixtures.json; reports/NEXT-003-coverage.json; reports/NEXT-003-ui-dependencies.json; reports/NEXT-003-rpc-gaps.json; reports/NEXT-003-gap-review.json; reports/NEXT-003-deferred.json |
| NEXT-004 | Ресурсы и рендеринг | done | Lunex Asset Library, WebGL, Spine, кеш, атласы, эффекты | reports/PIXI-02-library-build.log; reports/NEXT-004-smoke.log; reports/NEXT-004-squad.png; reports/NEXT-004-cache-build.log; reports/NEXT-004-cache-smoke.log; reports/NEXT-004-eviction-build.log; reports/NEXT-004-eviction-smoke.log; reports/NEXT-004-stress.log; reports/NEXT-004-stress-retry.log; reports/NEXT-004-effects-build.log; reports/NEXT-004-effects-smoke.log; reports/NEXT-004-final-smoke.log; reports/NEXT-004-hit.png (visual defect); reports/NEXT-004-skin-build.log; reports/NEXT-004-skin-smoke.log; reports/NEXT-004-layout-smoke.log; reports/NEXT-004-body-build.log; reports/NEXT-004-body-smoke.log; reports/NEXT-004-quality-build.log; reports/NEXT-004-quality-smoke.log; reports/NEXT-004-auto-build.log; reports/NEXT-004-auto-smoke.log |
| NEXT-005 | Общая инфраструктура | done | PostgreSQL, Redis, миграции, Docker, общие типы | next-server/compose.yaml; reports/NEXT-005-compose.log; reports/NEXT-005-storage-test.log; reports/NEXT-005-api-compose.log; reports/NEXT-005-restart.log; reports/NEXT-005-contract-test.log; reports/NEXT-005-reference-retry.log |
| NEXT-006 | Авторизация | done | Регистрация, гости, сессии, восстановление, выбор сервера | reports/NEXT-006-auth-test.log; reports/NEXT-006-routes-test.log; reports/NEXT-006-login-smoke.log; reports/NEXT-006-link-test.log; reports/NEXT-006-browser-auth-flow.log; reports/NEXT-006-guest-link-browser.log; reports/NEXT-006-api-deploy.log; reports/NEXT-006-recovery-test.log; reports/NEXT-006-real-e2e.log |
| NEXT-007 | Игровой профиль | done | Ник, аватар, уровень, опыт, энергия, валюты, сохранение | reports/NEXT-007-profile-test.log; reports/NEXT-007-edit-test.log; reports/NEXT-007-profile-ui-build.log; reports/NEXT-007-progression-test.log; reports/NEXT-007-profile-browser.log; reports/NEXT-007-assets-browser.log; reports/NEXT-007-final-browser.log |
| NEXT-008 | Главный интерфейс | done | Функциональный город, навигация, ресурсы, окна, адаптация; уведомления подключать вместе с соответствующими механиками. Графическая полировка отложена до NEXT-026. | reports/NEXT-008-city-build.log; reports/NEXT-008-city-browser.log; reports/NEXT-008-navigation-browser.log; reports/NEXT-008-navigation-publish.log; reports/NEXT-008-icons-browser.log; reports/NEXT-008-icons-publish.log; reports/NEXT-008-frames-browser.log; reports/NEXT-008-frames-publish.log; reports/NEXT-008-prefab-browser.log; reports/NEXT-008-prefab-publish.log; reports/NEXT-008-common-browser.log; reports/NEXT-008-common-publish.log; reports/NEXT-008-scene-browser.log; reports/NEXT-008-scene-publish.log; reports/NEXT-008-picker-browser.log; reports/NEXT-008-picker-publish.log; reports/NEXT-008-picker-final-browser.log; reports/NEXT-008-picker-final-publish.log; reports/NEXT-008-frame-effects.json; reports/NEXT-008-frame-import.json; reports/NEXT-008-frame-final-browser.log; reports/NEXT-008-frame-final-publish.log |
| NEXT-009 | Редактор интерфейса | deferred | Позиции, размеры, цвета, фоны, кнопки |  |
| NEXT-010 | Система героев | in_progress | Каталог, классы, фракции, редкость, параметры, способности |  |
| NEXT-011 | Формирование отряда | pending | 5×5, позиции, сохранение составов |  |
| NEXT-012 | Пошаговый боевой движок | pending | Очередность, скорость, урон, крит, лечение, эффекты, цели, пассивы; сравнение Elixir |  |
| NEXT-013 | Визуализация боя | in_progress | Spine, атаки, попадания, эффекты, HP, цифры урона | reports/PIXI-02-squad-build.log |
| NEXT-014 | Сюжетная кампания | pending | Главы, этапы, боссы, открытие, награды |  |
| NEXT-015 | Инвентарь и предметы | pending | Валюты, материалы, осколки, расходники |  |
| NEXT-016 | Развитие героев | pending | Уровни, звёзды, ранги, таланты, навыки, пробуждение, сброс |  |
| NEXT-017 | Экипировка | pending | Слоты, улучшение, комплекты, параметры |  |
| NEXT-018 | Призыв героев | pending | Баннеры, шансы, гарантии, массовый призыв, анимации |  |
| NEXT-019 | Экономика и Idle | pending | Idle, офлайн, магазины, ресурсы, таймеры |  |
| NEXT-020 | Задания и достижения | pending | Сюжетные, ежедневные, еженедельные задания, достижения |  |
| NEXT-021 | PvE-режимы | pending | Башни, подземелья, испытания, боссы, специальные режимы |  |
| NEXT-022 | PvP и социальные системы | pending | Арена, рейтинги, гильдии, чат, друзья, почта |  |
| NEXT-023 | События и монетизация | pending | Календарь, события, VIP, пропуски, предложения, платежи |  |
| NEXT-024 | Редакторы игрового контента | pending | Герои, навыки, предметы, противники, локации, квесты, награды, баннеры, магазины, события |  |
| NEXT-025 | Администрирование | pending | Аккаунты, аналитика, журналы, серверы, баланс, версии, бэкапы |  |
| NEXT-026 | Русификация и визуальное качество | in_progress | Контекстный перевод, терминология, шрифты, UI, удобство; восстановление оригинальных графических заголовков 10 входов города, замков, Spine-эффектов четырёх входов, геометрии камеры, окон и выбора оформления, рамок и портретов, визуальная сверка с оригиналом. | localization/ru.json |
| NEXT-027 | Оптимизация и сборки | pending | APK, PWA, докачка, обновления, кеш, память, FPS, безопасность |  |
| NEXT-028 | Приёмка и переход | pending | Полная сверка Elixir, миграция аккаунтов, бэкапы, переключение и откат по согласованию |  |

Контрольные сборки: Alpha 0.1 после 008 (редактор отложен); Alpha 0.2 после 014; Alpha 0.3 после 019; Beta 0.5 после 023; Beta 0.9 после 027; Release 1.0 после 028.

Test stand: https://rikagro.ru/testtest/ uses isolated Next API and database. Publish verified stages with tools/publish_testtest.sh. Public temporary preview, no production cutover.

NEXT-008: user requested original UI reconstruction. 23 original MainUIPanel atlas sprites extracted with SHA verification, Header/Bottom and hexagon frames integrated. Responsive browser PASS; published. Prefab geometry, remaining window frames, notification state and exact visual parity pending.

NEXT-008: extracted 184 MainUIPanel node records into public/city/prefab-layout.json; applied original Header/Dock proportions, dock centers and currency coordinates. Browser PASS 320/360/768; published. Full hierarchy/anchors and modal graphics still pending.

NEXT-008: imported 10 SHA-verified Common atlas sprites with capInsets metadata; applied nine-slice modal/profile borders, title and close button. City/profile browser PASS, published. Exact prefab-specific frame selection, remaining city geometry and notifications pending. NEXT-007 provisional portrait scale 74% verified functional.

NEXT-008.1: extracted nine module IDs, coordinates and sizes from MainScenePanel prefab into src/city/sceneLayout.ts; replaced grid with responsive mapped coordinates. Browser PASS, published. Vertical coordinates normalized to available area; exact scene camera and individual module graphics pending.

NEXT-008.2 partial: paginated visual avatar/frame picker added, original thumbnails and real PATCH API; existing profile regression PASS, published. Direct picker interaction test and exact original picker geometry pending; numeric selects retained. NEXT-008.1 individual module sprites still pending.

NEXT-008.2: filtered profile manifest against original server IDs (579 resources), removed numeric selects, sorted visual picker, added default frame option. Direct picker selection and persistence browser PASS after sorting fix; published. Original picker geometry and animated frames pending.

NEXT-008.2: original HeadFrame table (130 rows) verified in isolated Elixir reference. Only HeadFrame 3177 has Effect=UI_effect_TXK_wujingzhidian. Spine 3.8 skeleton, atlas and texture copied with SHA256 checks from Lunex Asset Library and mapped to original animation Ani_UI_effect_TXK_wujingzhidian. Profile now renders actual Spine overlay only for 3177; 129 other frames remain static (correct). Playwright with actual Next API checked frame selection, animation canvas, reload, removal, viewport; profile/city regression PASS. Published https://rikagro.ru/testtest/, original game HTTP200. NEXT-008 remains in_progress: exact original window/picker prefab, city building sprites, notifications and visual QA pending.

Решение пользователя: графическую полировку отложить до NEXT-026. Существующие ресурсы сохранить. NEXT-008 завершать по функциональным критериям: навигация, десятый вход 1055, адаптация, корректные состояния; реальные уведомления и ограничения подключать при реализации соответствующих механик. NEXT-009 и далее сохраняют порядок. Не задерживать перенос механик ради декоративного соответствия. NEXT-013 сохраняет обязательную синхронизацию попаданий и боевых событий.

NEXT-008 functional acceptance: all nine active city entrances tested; original tenth module 1055 inactive and shares Angels coordinates, retained as deferred metadata. Profile and navigation regression PASS; published. Visual polish NEXT-026; real notifications and unlocks with feature slices. NEXT-009 started.

По решению пользователя NEXT-009 отложен до NEXT-024. NEXT-010 начат. Сохранять редактируемые конфигурации и разделение UI/логики.

NEXT-010: exported original hero and skill tables from isolated reference: {'BuffBase': 19623, 'BuffDescription': 2019, 'FormationType': 12, 'HeroBase': 354, 'HeroLevel': 1340, 'HeroLevelAttribute': 198, 'HeroStar': 12, 'SkillBase': 10948, 'SkillEffect': 17119}. SkillBase/SkillEffect/BuffBase/BuffDescription are actual sources, not Skill. Integration pending.

NEXT-010: 354 original hero records projected into typed TypeScript catalog; read-only list/detail API tested and deployed. Ownership, skill unlock logic and client hero screen pending.

NEXT-010.2: original three starter heroes, migration 5, atomic collection initialization and authenticated GET /v1/heroes. Persistence/isolation tests passed; deployed. Third hero power zero retained pending recalculation. Client screen pending.

NEXT-010.3: functional heroes screen with actual authenticated collection, original three library portraits and Russian names, stored attributes and skill IDs. Browser tests passed and published. Skill descriptions and attribute recalculation pending.

Решение пользователя: собственные фантазийные имена вместо оригинальных/обычных имён. 11303 Аэлирис, 12301 Вейрисса, 12402 Селестари. ID и баланс сохранены. Браузерный тест PASS, опубликовано. Остальные имена назначать при переносе каталога.

NEXT-010.4: base attribute, growth, star, passive skill unlock and weighted power TypeScript calculation matches 72 original Elixir fixtures. Existing stored template stats differ from base-only calculation; do not overwrite until equipment/team and other modifiers are audited.

NEXT-010.5: base calculation and skill slots exposed in authenticated API; seven starter skill descriptions translated, fantasy names, unlock levels displayed, base stats separately from stored stats. Tests passed and published. Other heroes localization and complete modifiers pending.

NEXT-011.1: six original player formations 101–106, six slots, original default 1001/1002, migration 6, authenticated GET/PUT, ownership and duplicate validation, atomic stored power sum. UI pending. NEXT-010 residual modifiers/localization remain open.

NEXT-011.2: touch formation editor, original six layouts, real hero portraits, assign/move/remove, save/reload verified, published. Battle integration and unsaved changes confirmation pending.

NEXT-011.3: internal battle snapshot from saved formation, original positions, initial attrs, active/passive skills and cooldowns. Two stored starter units match Elixir exactly; third requires full HeroAttrs.compute (reference HP370), deliberately rejected until ported. Empty formation rejected. Tests passed. Not exposed publicly; row bonuses and skins pending.

NEXT-011 done for starter scope: original team bonuses and level/star scores reproduce all three starter battle units exactly. Fallback restricted to matching starter identity/level/star. Full dynamic modifiers, row bonuses, skins and unsaved-change prompt deferred to corresponding mechanics. NEXT-012 in progress. 19 tests passed. Internal code only, no deployment.

NEXT-012.1: internal round scheduler with original speed/camp/station ordering, fixed round order, dead skip, winner priority and timeout, immutable input, round hooks. 22 tests passed. Actual actions, queue, buff speed and report protocol pending; not deployed. NEXT-026 visual parity: original rectangular hero cards, 4-column grid, faction/class icons, stars, filters, original UI atlas.

NEXT-012.2: Target.ex rules ported to TypeScript, row/column/neighbor/self/dead/previous target selection, priorities and count. 25 tests passed. Random source injected; exact Elixir RNG parity and live battle integration pending. Original Target.ex itself documents inferred meanings of some target types. No deployment.

NEXT-012.3: pure hit formula from Battle.hit, physical/magical/true/elemental, dodge, crit, penetration cap, faction, PvP, multiplier floor and variance. 28 tests passed. Effective attribute hook, RNG injection. HP application, shields, special damage and Elixir differential fixtures pending. Not deployed.

NEXT-012.4: action planning, original 10948 skill configs, 295 model animation configs, 82 multi-hit actions, cooldown consumption/tick, normal fallback, taunt/disable hooks, effect group placement and split damage. 30 tests passed. Effect execution and buff triggers pending. No deployment.

NEXT-012.5a: imported 19623 BuffBase and 17119 SkillEffect projections; attribute stacking, dynamic HP-based modifiers, immunity, tags, trigger limits, expiry and temporary cleanup. 32 tests passed. Effect execution, stacking application, trigger dispatch and conditions pending. No deployment.

NEXT-012.5b partial: buff application for 601/111/371/345/117, stack cap, refresh, proportional HP, removal, control chance and fail-closed unsupported effects. 34 tests passed. DOT, trigger dispatch, HP expiry integration, conditions and damage execution pending. No deployment.

NEXT-012.5c partial: trigger dispatch, relative event codes, recursion guard depth 4, source attribution, round-end 502 and expiration 1, cooldown tick. 36 tests passed. Effect execution callback only; DOT/HOT actual damage, conditions and integrated round loop pending. No deployment.

NEXT-012.5d partial: original special damage 118 formula, base params, caps, resistance, tagged modifiers, trigger integration test with isolated unmitigated HP sink. 38 tests passed. Production mitigation/death pipeline, tag modifier application and named DOT parity pending. No deployment.

NEXT-012.6a: HP damage mitigation, immunity, counted and HP shields, ratio/flat reduction, hit cap, lethal guard, healing modifiers/overflow and revival. 41 tests passed. Buff configuration attachment, guard skill dispatch, death events, periodic integration and full parity pending. No deployment.

NEXT-012.6b partial: shared execution for 101/102/105/137/118/103/104/119/112, normal and periodic damage through same mitigation, heal overflow and accumulated damage, round-end DOT/HOT integration tests. 43 tests passed. Full SkillEffect traversal, defense buff attachment, death events and extra actions pending. No deployment.

NEXT-012.6c partial: automatic simulation connects round order, original skill/effect/buff traversal, supported instant effects, buff application and round-end triggers; deterministic integration test. 44 tests passed. Unsupported conditions/effects recorded; defense attachment, passive/death events, exact RNG, multi-hit report and parity pending. No deployment.

NEXT-012.6d partial: defense buff configuration opcodes 405/411/412/413/501/502/504/602/603 attached through applyBuff, simulation base value integration, stacked shield test. 45 tests passed. Passive initialization, death events, extra skills and squad parity pending. No deployment.

NEXT-012.6e partial: initial passive skill traversal, round start 501 and preturn 163, temporary cleanup, stun/silence/crit tags, two-by-two simulation test. 46 tests passed. Passive-specific fixtures, death events, extra actions, taunt and full parity pending. No deployment.

NEXT-012.6f partial: shared round trigger engine, damage/heal/revive/death reactions, death buff cleanup, bounded extra skill queue (12), lethal guard skill queue. 47 tests passed. Exact event context, extra action type/target semantics, dedicated counterattack fixtures and parity pending. No deployment.

NEXT-012.7: versioned internal result summary, original outcome codes 2/3/4, sorted hero final HP/buffs and damage/hurt/healing, aggregate camp statistics. 48 tests passed including victory/defeat/timeout. New JSON summary is not original protobuf, no rewards or public endpoint, full parity pending. No deployment.

## Правило приёмки этапов (2026-11-24)
Каждый этап закрывается только после выполнения 100% утверждённого объёма, интеграционных проверок и документирования доказательств. Исключения только по отдельному согласованию. NEXT-012 остаётся in_progress; переход к NEXT-013 заблокирован до полной приёмки. Ранее начатые этапы не считать доказательством полной готовности.

NEXT-012 acceptance audit: configuration opcode inventory saved to reports/NEXT-012-completion-audit.json. Counts are static, not proof of runtime support. Next: condition languages, missing start/trigger opcodes, mixed effects, targeting and differential tests. Acceptance gate remains closed.

NEXT-012 completion: effect conditions 1–5 and logical markers ported from Elixir; integrated in simulation. 49 tests passed. Unknown catalog codes 101/400/700 remain unresolved; first-action semantics for extra actions require parity checks. Gate remains closed.

NEXT-012: start conditions 1–7,10,11 ported and integrated, 50 tests passed. Client BattleConsts identifies effect condition 101 Field, start 8 MemberElementCount and 12 BattleTagType, but no execution semantics located; effect 400/700 and start 28 unnamed. Remain unresolved, no invented semantics. Gate closed.

NEXT-012: trigger condition evaluator ported and connected. 51 tests passed. Event metadata propagation and unsupported codes remain; gate closed.

NEXT-012: damage/heal events now carry skill, buff, value and provisional attack type metadata; passive and extra skill IDs propagated. 51 regression tests passed. Exact attack type mapping, buff lifecycle events and dedicated integration fixtures remain. Gate closed.

NEXT-012: corrected SkillAttackType mapping from BattleConsts and Elixir action/queue: normal turn 1, queued skill uses configured type, passive 0. 52 tests passed. Guard type, instant extra skill semantics and end-to-end event parity remain unverified. Gate closed.

NEXT-012: partial stack removal, dispel 113, removal 115/116/131, before-dispel 2, attach 157 and control 124/146, fresh duration based on turn/end phase. 53 tests passed. Mixed instant/persistent effects, replacement 122 and differential parity remain. Gate closed.

NEXT-012.9: ordered mixed instant/persistent effects, replacement 122 with depth guard, event 121, lethal attachment guard. 55 tests passed. Replacement integration parity and immediate skill 120 remain unverified. Gate closed.

NEXT-012.10: skill 120 instant vs animated queue, -1/-2 aliases, event target ordering 2/7, depth 8 and queue limit 12. 56 tests passed. Guard attack type and end-to-end action triggers/parity remain unverified. Gate closed.

NEXT-012.11: taunt tag 15, animated action lifecycle events 153/101/102/154/155/123/144/162/161/503, target metadata and temporary cleanup. 56 regression tests passed. Dedicated differential action fixtures and head/tail modifiers remain. Gate closed.

RTB Android separate track: android-rtb/PLAN.md; APK-001 audit partial, APK-002 prototype built; APK-003 onward pending.

RTB APK-003/004 partial; APK-005 pending.

NEXT-012.12 partial: max HP damage 106 with boss cap, skill head/tail modifiers 373/374. 58 tests passed. Remaining unsupported effects and description events require audit; gate closed.

RTB APK-003/004 UI prototype 0.3 built; acceptance pending device QA.

Approved priority change: NEXT-010 full hero asset catalog first, then effect mapping and hero editor, then resume NEXT-012.12. Exact-name audit recorded in reports/NEXT-010-hero-assets.json; ambiguous matches require verification. No runtime assets copied yet.

NEXT-010.2: original HeroBase only; exact boss/angel naming variants from Queen Blade library; verified skeleton and texture hashes for unique matches; public hero-asset-map.json metadata only. Ambiguous and missing models remain unresolved.

NEXT-010.3 partial: 272 original models linked from verified library (228723187 bytes), lazy Spine preview with search and animation selection published at /testtest/hero-preview.html. Build and HTTP checks passed; visual browser validation and 24 unresolved models remain. Main game unchanged.

NEXT-010.2/3: original HeroSkillConfig BundleName exported for all 296 models, resolves ambiguous candidates and four missing aliases; published updated verified model map and original animation event timelines. Browser visual checks and effect rendering pending.

NEXT-010.5 partial: skill effect map generated from original bundle dependencies and exact animation names; verified single-page Spine assets linked and published. Missing/ambiguous effects recorded, playback not yet implemented.

NEXT-010.5: multi-page Spine atlas support implemented; 202 additional effect mappings imported (25 assets), build and HTTP manifest check passed. Browser rendering still unverified. 95 mappings remain.

RTB APK-005 pack server preparation partial.

NEXT-010.5: decoded original SkillEffect prefab skeleton UUID references including packed Cocos imports; 1697/1750 mappings, 287 assets, zero ambiguous, 53 missing across nine models. Published manifest; visual playback pending.

NEXT-010.5: recovered nine original effect skeletons and texture sets; Spine 3.8 binary parser verified 47 additional animation names, 1744/1750 matched. Six names absent from original referenced skeletons; browser texture/render validation pending.

NEXT-010.5: four explicit original-skeleton naming aliases recorded separately from 1744 exact matches; two unresolved Culot3501 names remain. Alias visual parity unverified.

NEXT-010.6 partial: hero preview extended with actual Spine skin selector, per-model effect preview including aliases, JSON export. TypeScript and Vite build passed, HTTP published. No server persistence or browser visual verification yet.

NEXT-010.6.2 partial: local timeline editor reads original skills, edits start/duration/offsets/layer/follow flags, highlights events on playback clock, resets and exports original plus draft JSON. TypeScript/Vite and HTTP passed. No synchronized Spine playback, server writes or browser test yet.

NEXT-010.6.3 partial: effect preview drag with pointer capture, X/Y/scale/rotation controls, origin marker, reset and export placement. Layer flag export only; coordinates preview-local. TypeScript/Vite/HTTP passed; browser interaction unverified.
