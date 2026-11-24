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
| NEXT-009 | Редактор интерфейса | in_progress | Позиции, размеры, цвета, фоны, кнопки |  |
| NEXT-010 | Система героев | pending | Каталог, классы, фракции, редкость, параметры, способности |  |
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

Контрольные сборки: Alpha 0.1 после 009; Alpha 0.2 после 014; Alpha 0.3 после 019; Beta 0.5 после 023; Beta 0.9 после 027; Release 1.0 после 028.

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
