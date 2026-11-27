# RockBogini Next — утверждённая генеральная дорожная карта

## ПРИОРИТЕТ С 2026-11-27: СНАЧАЛА ПОЛНАЯ ИГРОВАЯ МЕХАНИКА

Решение владельца: графическую сверку 1:1 NEXT-026 временно отложить; вначале закрыть геймплейные пробелы. Текущий этап **NEXT-015.3**: оригинальные рецепты объединения осколков героев. Потом NEXT-015.4 RandomBox/LockedBox, 020.2 достижения, 016 рост, 021 PvE, 022 PvP/социальные функции, 023 события, 024–025 редакторы/админ. Графика и APK только после этих ворот.

Канонический проект: /home/gamedev/rocbogini, публичный Next: https://rikagro.ru/sexyidle/. Полный аудит 13 функциональных групп: reports/NEXT-MECHANICS-2026-11-27.md и JSON, исходники оригинала 79 модулей обработчиков, порт 46 серверных TS. Наличие файлов **не равно** игровой совместимости 1:1.

NEXT-015.3: 523 оригинальные записи ItemPiece, из них 218 полных рецептов фрагментов героя. Транзакционное одиночное и массовое объединение, клиент, изолированные DB тесты 5/5, браузер UI 3 разрешения с тестовыми ответами. Отчёт reports/NEXT-015.3-hero-piece-compose-2026-11-27.md. Родительский NEXT-015 остаётся в работе.


VPS is the development stand; GitHub main is the published source mirror. **SINGLE-PROJECT-001**: одна финальная кодовая база в `/home/gamedev/rocbogini/`; единственная публикация Next — `/testtest/`; без параллельных копий проекта. Original game and Elixir unchanged until separate cutover approval. Vertical slices: reference → server → parity → UI/assets → integration → tests → visual QA → documentation. Old roadmap: archive/ROADMAP-before-next.md.

## Актуальный срез: 2026-11-26

Активная задача: **NEXT-026** визуал 1:1 на shipped (D-012). 020.1 закрыт. Передача Cursor: docs/CURSOR_HANDOFF.md.
12 из 28 основных этапов закрыты, 7 в работе, 1 отложен, 8 ожидают. (авто из roadmap.json)

### Сводка по блокам
| Статус | ID |
|---|---|
| done | 001–008, 011, 013–014, 016–017 |
| in_progress | 010 герои · 012 бой · 015 инвентарь · 018 призыв · 019 экономика · 020 задания · 026 визуал/RU |
| deferred | 009 → 024 |
| pending | 021 PvE · 022 PvP/соц · 023 события/монетизация · 024 редакторы · 025 админ · 027 сборки · 028 cutover |

### NEXT-026 контроль 2026-11-26 (фактические обновления)
- 026.1: оригинальные 9 вывесок и HUD, золото/алмазы (ID 1/3), графические цифры силы, XP по PlayerLevel. QA Playwright PASS 320/360/390/768, пересечений кнопок и битых img нет. Доработать оригинальную анимацию через единый WebGL-рендерер и подтвердить 1:1 с эталоном.
- 026.2: HeroListPanel Bg 1080×2520, **20 оригинальных Common спрайтов рамок и карточек**, 4 колонки, переключение вида, сортировка, фильтрация ElementType по каталогу из 354 героев. Chrome 320/390/768 PASS (клики/сортировка/фильтр/детали), подробнее reports/NEXT-026.2-hero-original-cards-2026-11-26.md. Не считать полным 1:1 до точных оригинальных кнопок, детальной сцены, сверки геометрии и Android QA.
- Каноническая предварительная публикация текущего HUD/героев: https://rikagro.ru/sexyidle/; /testtest/ прежний отдельный тестовый URL, не считать автоматически идентичным. Исходники не пересоздавать.
- Операционные пробелы: GitHub push/CI не подтверждены (нет авторизации HTTPS); старый отдельный Spine canvas вызывал мерцание, поэтому эффекты выключены.
- Отчёт: reports/NEXT-026.1-026.2-2026-11-26.md.

### 026.2 HeroDetailPanel, 2026-11-26
- По оригинальному Cocos prefab: Background 928×1358; четыре BaseAttrItem 618×64; ScrollView 880×786; секции умений и экипировки. В HeroesScreen подключены портрет, исходная рамка карточки, сила и четыре строки характеристик; имеющиеся оригинальные ui/attr_bg/commonPanelBg1 применены как временный стиль. Браузерное тестирование 320/390/768 PASS, сборка/публикация PASS.
- **Не 1:1 и не закрыто:** исходный фон HeroDetailPanel UUID 269yyAZp9El7jeXeC1pkD0 не разрешён; полноценная компоновка и анимация героя, проверка по эталону впереди. Evidence: reports/NEXT-026.2-herodetail-2026-11-26.md.

### NEXT-026.2, 5 подэтапов подряд (2026-11-26)
1. Найден и импортирован оригинальный фон CommonBg/PanelBg1: 1028×1516, prefab 928×1358, capInsets 120.
2. Разделы деталей героя: развитие, экипировка, характеристики, способности с работающей навигацией, прежние серверные действия сохранены.
3. Browser E2E на 320×640, 360×740, 390×844, 768×1024 PASS: guest→city→heroes→detail→skills.
4. Nine-slice Cocos исходной текстуры через border-image-slice 120 fill, сборка+публикация+4/4 PASS.
5. Документация, дорожная карта и Git-коммит обновлены. Отчёт reports/NEXT-026.2-5-stage-2026-11-26.md. **026 остаётся in_progress**: полный оригинальный HeroDetailPanel, Spine, точная геометрия и сверка 1:1 не приняты.

### NEXT-026.3, 20 последовательных подэтапов (26.11.2026)
- 026.3.01–04: WorldMapPanel, оригинальные PNG/map1 и map2; интеграция и браузерная проверка карты кампании.
- 026.3.05–08: BagPanel, оригинальный Bg 1080×2520; визуал инвентаря и браузерная проверка.
- 026.3.09–12: SummonHeroPanel, четыре оригинальных спрайта; вкладки и браузерная проверка.
- 026.3.13–16: ShopPanel, оригинальная героиня + четыре иконки; интерфейс магазина и браузерная проверка.
- 026.3.17–20: TaskPanel, девять оригинальных спрайтов (фоны, значки, сундуки), контрастная подложка и браузерная проверка.
- Итого 21 оригинальный файл с контрольными SHA256; 10/10 мобильных проверок PASS (320×640, 390×844), Vite production build PASS, /sexyidle опубликован. Документы reports/NEXT-026.3-20-stages.md и reports/NEXT-026.3-20-stages.json. **Это подэтапы NEXT-026, а не закрытие 20 главных фаз**. 1:1 геометрия, Spine и визуальная приёмка открыты; родительский NEXT-026 остаётся in_progress.

### NEXT-026.4, частичная поставка 2026-11-27
- Подключены оригинальные Spine-модели из архива (354 hero ID → 296 моделей), разрешается показ по кнопке на HeroDetailPanel; 30 FPS, уничтожение канваса при закрытии, выбор всех доступных оригинальных анимаций.
- Проверены все три стартовых героя Alina1301, Ally2301, Nanaaier2401 в браузере.
- Из SkillIcon импортированы 1 135 **точных** WebP, со ссылками на источник и SHA256; 24 дополнительных записи есть в config, но отсутствуют файлы native. Иконки отображаются по реальным slot.id.
- Экран HeroDetailPanel открывается отдельно, возврат кнопкой и Esc. Контраст на оригинальном светлом PanelBg1 исправлен.
- Окно повышения звезды читает состав и стоимость с сервера, использует оригинальные иконки предметов. Транзакция не проверена из-за ограничений стартовых героев.
- QA: город, предыдущие пять экранов и экран героев PASS, мобильные 320/390/768. Vite/tsc и /sexyidle PASS.
- **Не считать 20 этапов завершёнными**: предложенный пакет NEXT-026.4 выполнен частично, ключевые механики и точное 1:1 остались. Отчёт reports/NEXT-026.4-2026-11-27.md.

### NEXT-026.4 оригинальные предметы экипировки, 2026-11-27
- В деталях героя восемь исходных ItemIcon (4 обычные слота и 4 священных); реальный ItemId берётся с сервера, в пустом слоте показан затемнённый образец, не выдаётся за надетую вещь. Проверка 320/390px 8/8 PASS. Отчёт reports/NEXT-026.4-original-equipment-2026-11-27.md. Механика экипировки не менялась; проверка серверной транзакции и 1:1 визуала открыта.

### NEXT-026.4 боевой отряд (2026-11-27)
- Оригинальный Cocos BattleFormationPanel: фон Bg 1080×2520 и 8 спрайтов из атласа 492×225, источник и SHA256 в reports/NEXT-026.4-formation-assets.json. Маркеры formation_on/off/blue, original btn2 для сохранения. Серверные позиции Form.Data не переписывались. QA: 9 позиций, открытие и возврат, 320/390/768 PASS. Геометрия 1:1 и drag-drop не приняты, отчёт reports/NEXT-026.4-formation-2026-11-27.md.

### NEXT-026.4 результат боя (2026-11-27)
- Из оригинального каталога ItemIcon в наградах используются изображения по серверному itemId; в статистике добавлены оригинальные портреты по heroId. Оригинальный пакет SettlementPanel аудирован, WinPanel/FailPanel и atlas dataBottom/linesBottom найдены, но точная расстановка не проверена, поэтому подмена интерфейса не выполнялась. Vite PASS, публикация PASS; полный браузерный бой до победы/поражения и визуал 1:1 открыты. Отчёт reports/NEXT-026.4-result-original-icons-2026-11-27.md.

### NEXT-026.4: призыв, оригинальные карточки и исправление PostgreSQL (2026-11-27)
- В результате реального призыва отображаются оригинальные рамки/фоны 218×318 и портреты из Common/профиля; данные приходят от сервера. Мобильный E2E 390×844 и 320×640: бесплатный призыв ×1, герои получены, рамки/портреты загружены, закрытие окна PASS.
- Исправлена ошибка PostgreSQL 23505 player_heroes_pkey на SID1001: стартовая коллекция создаётся до выдачи героя, старые незавершённые учётные записи восстанавливаются без удаления полученных героев. Отдельная тестовая PostgreSQL/Redis: 11/11 summon PASS. Перед обновлением бэкап БД и модулей.
- **Не закрыто**: точная анимация открытия и Cocos prefab 1:1, транзакционная параллельная выдача и все 20 предложенных задач. Evidence: reports/NEXT-026.4-summon-real-pull-2026-11-27.md.

### NEXT-026.4: аудит полной БД-интеграции, 2026-11-27
- Отдельная PostgreSQL+Redis для 11 тестов призыва: **11/11 PASS**. GitHub CI для коммита 95b02b5 зелёный, но оставшиеся БД-тесты в CI пропускаются. Попытка запуска полного набора 144 тестов с параллельностью 3 превысила 220 секунд и выявила две блокировки PostgreSQL 40P01 в тестах авторизации и дерева героев. Полный набор **не принят**. Временные контейнеры остановлены, prod БД не использовалась. Требуется последовательный тестовый стенд/изолированные схемы. Отчёт reports/NEXT-026.4-integration-suite-audit-2026-11-27.md.

### Открытые подэтапы сейчас
- **026.1** city visual parity — mobile HUD QA PASS, 1:1 + Spine acceptance open
- **026.2** original HeroListPanel — original background + 4-column grid live, frames/filters/detail pending
- **026.x** 1:1 окон (campaign/heroes/inventory/summon/shop/tasks)
- **020.2+** / **021** PvE — механики параллельно по запросу
- **015** random/event consume
- **018** activity summons → вместе с **023**

Проверено до среза: 026.1 city Spine; live https://rikagro.ru/testtest/.

| ID | Этап | Статус | Объём | Доказательство |
|---|---|---|---|---|
| NEXT-001 | Архитектура клиента | done | PixiJS 7, Spine 3.8, React, TypeScript, сборка | reports/PIXI-01-build.log |
| NEXT-002 | Архитектура сервера | done | Fastify, REST, WebSocket, тесты | reports/SERVER-01-test.log |
| NEXT-003 | Полный аудит оригинала | done | Реестр экранов, протоколов, конфигураций, формул, зависимостей и тестов | reports/NEXT-003-inventory.json; reports/NEXT-003-mapping.json; reports/NEXT-003-findings.md; reports/NEXT-003-baseline.log; reports/NEXT-003-fixtures.json; reports/NEXT-003-coverage.json; reports/NEXT-003-ui-dependencies.json; reports/NEXT-003-rpc-gaps.json; reports/NEXT-003-gap-review.json; reports/NEXT-003-deferred.json |
| NEXT-004 | Ресурсы и рендеринг | done | Lunex Asset Library, WebGL, Spine, кеш, атласы, эффекты | reports/PIXI-02-library-build.log; reports/NEXT-004-smoke.log; reports/NEXT-004-squad.png; reports/NEXT-004-cache-build.log; reports/NEXT-004-cache-smoke.log; reports/NEXT-004-eviction-build.log; reports/NEXT-004-eviction-smoke.log; reports/NEXT-004-stress.log; reports/NEXT-004-stress-retry.log; reports/NEXT-004-effects-build.log; reports/NEXT-004-effects-smoke.log; reports/NEXT-004-final-smoke.log; reports/NEXT-004-hit.png (visual defect); reports/NEXT-004-skin-build.log; reports/NEXT-004-skin-smoke.log; reports/NEXT-004-layout-smoke.log; reports/NEXT-004-body-build.log; reports/NEXT-004-body-smoke.log; reports/NEXT-004-quality-build.log; reports/NEXT-004-quality-smoke.log; reports/NEXT-004-auto-build.log; reports/NEXT-004-auto-smoke.log |
| NEXT-005 | Общая инфраструктура | done | PostgreSQL, Redis, миграции, Docker, общие типы | next-server/compose.yaml; reports/NEXT-005-compose.log; reports/NEXT-005-pull.log; reports/NEXT-005-storage-build.log; reports/NEXT-005-storage-test.log; reports/NEXT-005-api-compose.log; reports/NEXT-005-restart.log; reports/NEXT-005-contract-test.log; reports/NEXT-005-reference-retry.log |
| NEXT-006 | Авторизация | done | Регистрация, гости, сессии, восстановление, выбор сервера | reports/NEXT-006-auth-build.log; reports/NEXT-006-auth-test.log; reports/NEXT-006-routes-test.log; reports/NEXT-006-login-ui-build.log; reports/NEXT-006-login-smoke.log; reports/NEXT-006-client-integration-build.log; reports/NEXT-006-browser-auth-flow.log; reports/NEXT-006-link-test.log; reports/NEXT-006-link-client-build.log; reports/NEXT-006-guest-link-browser.log; reports/NEXT-006-api-deploy.log; reports/NEXT-006-recovery-test.log; reports/NEXT-006-recovery-ui-build.log; reports/NEXT-006-recovery-deploy.log; reports/NEXT-006-real-e2e.log |
| NEXT-007 | Игровой профиль | done | Ник, аватар, уровень, опыт, энергия, валюты, сохранение | reports/NEXT-007-profile-test.log; reports/NEXT-007-config-export.log; reports/NEXT-007-edit-test.log; reports/NEXT-007-profile-ui-build.log; reports/NEXT-007-progression-test.log; reports/NEXT-007-profile-browser.log; reports/NEXT-007-assets-browser.log; reports/NEXT-007-final-browser.log; reports/NEXT-007-final-publish.log; frame 3101 visual fallback deferred NEXT-026; reports/NEXT-007-frame-fix-browser.log |
| NEXT-008 | Главный интерфейс | done | Функциональный город, навигация, ресурсы, окна, адаптация; уведомления подключать вместе с соответствующими механиками. Графическая полировка отложена до NEXT-026. | reports/NEXT-008-city-build.log; reports/NEXT-008-city-browser.log; reports/NEXT-008-navigation-browser.log; reports/NEXT-008-navigation-publish.log; reports/NEXT-008-icons-browser.log; reports/NEXT-008-icons-publish.log; reports/NEXT-008-frames-browser.log; reports/NEXT-008-frames-publish.log; reports/NEXT-008-prefab-browser.log; reports/NEXT-008-prefab-publish.log; reports/NEXT-008-common-browser.log; reports/NEXT-008-common-publish.log; reports/NEXT-008-scene-browser.log; reports/NEXT-008-scene-publish.log; reports/NEXT-008-picker-browser.log; reports/NEXT-008-picker-publish.log; reports/NEXT-008-picker-final-browser.log; reports/NEXT-008-picker-final-publish.log; reports/NEXT-008-frame-effects.json; reports/NEXT-008-frame-import.json; reports/NEXT-008-frame-final-browser.log; reports/NEXT-008-frame-final-publish.log; reports/NEXT-008-functional-browser.log; reports/NEXT-008-functional-publish.log |
| NEXT-009 | Редактор интерфейса | deferred | Позиции, размеры, цвета, фоны, кнопки |  |
| NEXT-010 | Система героев | in_progress | Каталог, классы, фракции, редкость, параметры, способности; собственные фантазийные имена героев без изменения ID и баланса | next-audit/hero-catalog.json; reports/NEXT-010-skills-export.log; reports/NEXT-010-catalog-test.log; reports/NEXT-010-catalog-deploy.log; reports/NEXT-010-ownership-retry.log; reports/NEXT-010-ownership-deploy.log; reports/NEXT-010-heroes-ui-browser.log; reports/NEXT-010-heroes-ui-publish.log; reports/NEXT-010-fantasy-names-browser.log; reports/NEXT-010-attrs-test.log; reports/NEXT-010-skills-test.log; reports/NEXT-010-skills-ui-browser.log; reports/NEXT-010-hero-assets.json; reports/NEXT-010-preview-build.log; hero-preview.html |
| NEXT-011 | Формирование отряда | done | Формирование и сохранение стартового отряда; стартовый объём принят. | reports/NEXT-011-server-test.log; reports/NEXT-011-server-deploy.log; reports/NEXT-011-ui-browser.log; reports/NEXT-011-ui-publish.log; reports/NEXT-011-units-test.log; reports/NEXT-011-complete-test.log |
| NEXT-012 | Пошаговый боевой движок | in_progress | Эталонное боевое ядро принято для визуальной интеграции: 681/681 боёв, 75/75 тестов. Полная коммерческая идентичность, дополнительные модификаторы и некампанийные режимы не подтверждены. | reports/NEXT-012.31.5-acceptance.json; reports/NEXT-012.31.5.1-metadata-*.json; reports/NEXT-012.31.5.1-tests.log |
| NEXT-013 | Визуализация боя | done | Закрыт по D-011 (визуальная приёмка владельцем). Технические остатки 013.8 известны. | reports/NEXT-013.*; D-011 |
| NEXT-014 | Сюжетная кампания | done | 014.1–014.15: campaign + finger overlays + plot video. Richer targets open. | reports/NEXT-014.15.md; reports/NEXT-014-tails-015-*; reports/NEXT-014.5-14-* |
| NEXT-015 | Инвентарь и предметы | in_progress | 015.1–015.2 done. Random/event consume open. | reports/NEXT-015.2.md; reports/NEXT-015.1.md |
| NEXT-016 | Развитие героев | done | 016.1–016.5 level/star/talent/jobs/luck | reports/NEXT-016.5.md |
| NEXT-017 | Экипировка | done | 017.1–017.8 equip + holy full slice (gallery/resonance). | reports/NEXT-017.8.md; reports/NEXT-017.7.md |
| NEXT-018 | Призыв героев | in_progress | 018.1–018.6 done. Activity summons → 023. | reports/NEXT-018.6.md; reports/NEXT-018.5.md; reports/NEXT-018.4.md; reports/NEXT-018.3.md; reports/NEXT-018.2.md; reports/NEXT-018.1.md |
| NEXT-019 | Экономика и Idle | in_progress | 019.1–019.4 idle/quick/rewards/shops+VIP done. Mall packs → 023. | reports/NEXT-019.4.md; reports/NEXT-019.3.md; reports/NEXT-019.2.md; reports/NEXT-019.1.md |
| NEXT-020 | Задания и достижения | in_progress | 020.1 daily/weekly + point chests done. Story/achievements open. | reports/NEXT-020.1.md |
| NEXT-021 | PvE-режимы | pending | Башни, подземелья, испытания, боссы, специальные режимы |  |
| NEXT-022 | PvP и социальные системы | pending | Арена, рейтинги, гильдии, чат, друзья, почта |  |
| NEXT-023 | События и монетизация | pending | Календарь, события, VIP, пропуски, предложения, платежи |  |
| NEXT-024 | Редакторы игрового контента | pending | Герои, навыки, предметы, противники, локации, квесты, награды, баннеры, магазины, события; выполнить отложенный NEXT-009 (редактор интерфейса) |  |
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

NEXT-010.6.4 partial: two-actor timeline preview with selectable opponent, original animation events, effect layers, offsets and demonstration hit counter; movement/audio/damage and exact positioning pending. TypeScript/Vite/HTTP passed; browser rendering unverified.

NEXT-010.6.5 partial: migration 7 and append-only studio draft storage, optimistic revision checks with transaction lock, history and restore as new revision; PostgreSQL integration test passed. No public write routes or UI persistence until admin authorization.


NEXT-010.6.6: linked-account admin allowlist (migration 8), live-session authorization and rate limit, isolated studio GET/PUT/restore, version conflicts/history, hero and skill draft UI. Full backend test suite 60/60 passes; TS and Vite pass. Deployed only next API and test page; studio public request without bearer 401, Next ready 200, original game HTTP 200. No administrator has been provisioned automatically; original game content remains unchanged. Browser UI and on-device interaction not yet verified.

NEXT-010.6.6: studio_admins role-gated server API (me, history, save and restore) now deployed to isolated next API, editor login and revision controls built; full 60/60 integration tests pass including non-admin denial and revision conflict, original game HTTP200. No admin has been assigned automatically. Browser visual acceptance pending.

NEXT-012.13 partial: original BuffBase/BuffDescription export used for description events 125/128 (report types 23/24), separate simulation description journal; persistent 373/374 attachment and group ordering tested. Full suite 62/62 passed. Client rendering and original report differential verification pending; parity gate remains closed.

NEXT-012.14 partial: dodge emits 158 and counts as attacked; element damage 137 no longer emits ordinary attack reactions; passive silence and death listener extra-skill tests added. Full suite 64/64 passed. Differential battle report and dodge integration fixtures pending.

NEXT-012.15 partial: shield absorption report type 4 journal, death guard description and guard skill ordering aligned to reference; combined shield and low-HP guard regression tests. Full suite 66/66 passed. Client rendering and differential reports pending.

NEXT-012.16 partial: healing overflow and full-HP heal reactions aligned, recovery journal types 5/7/22 added, damage-based healing and blocked-overflow regression tests. Full suite 68/68 passed. Nested extra-effect report parity and client integration pending.

NEXT-012.17 audit: static effect inventory reports/NEXT-012.17-inventory.json; distinguishes reference-handled and reference-skipped candidates, no parity claims. Baseline 68/68 tests. Next: differential fixtures and shared action context for trigger effects; parity gate remains closed.

NEXT-012.18 partial: trigger 117 resets selected/all cooldowns; 111/601 trigger accumulators explicitly discarded as in reference fire(). Regression suite 69/69. Differential real battle fixtures still pending; parity gate closed.

NEXT-012.19 partial: isolated Elixir reference and TypeScript comparison on stage 100101, four seeds, identical initial units; 4/4 winner and round count match, no unsupported issues. RNG algorithms differ; exact hero stats and skill sequence parity not established. Export and comparison scripts saved, gate closed.

NEXT-012.20 partial: OTP 27 exsss BigInt port matches 3200/3200 reference RNG draws; 100/100 stage 100101 battles match result, rounds and final per-unit HP/damage/hurt/healing exactly. 70/70 tests. Same stage and lineup only; diverse stages, bosses, skill sequence and production RNG wiring pending; parity gate closed.

NEXT-012.21 partial: 120 comparative battles across 12 campaign maps, two formations, five seeds. 115/120 exact final metrics, 120/120 winner and rounds, zero reported unsupported issues. Five mismatches on map 100134 require trace comparison. Same three starter heroes, no dedicated boss coverage. Gate closed.

NEXT-012.22 partial: fixed premature StartWorkCondition evaluation before chance draw, matching reference try_apply order. Replayed all 220 fixtures: 220/220 exact final metrics; 70/70 tests. Dedicated boss and diverse hero coverage pending, parity gate closed.

NEXT-012.23: 80 synthetic six-v-six comparisons using 24 original hero IDs, levels 60/120, 38 distinct passive skills, 40 normal and 40 boss-flagged scenarios. 80/80 exact final metrics. Eight diagnostic categories remain (reference skip/false candidates); real boss encounters and event sequence parity pending. Gate closed.

NEXT-012.24: reference source confirms start effects 301/372/403/414/505/506/615 skipped and unknown trigger 11/start condition 8 false. Retained diagnostics. 72/72 real AllianceTest boss-map fixtures match final metrics and animated action sequence (round, actor, skill, targets). Synthetic attackers, not full guild handler; campaign bosses and hitpoint event parity pending. 70/70 tests. Gate closed.

NEXT-012.25 partial: added animated action hitpoint damage/dodge trace, original split and extra damage classification, fixed effect chance before condition. 72/72 boss damage-event sequences and 372/372 final metrics match, 70/70 tests. Healing/shield/death/buff event ordering, instant pages, API wiring and campaign bosses remain pending; gate closed.

NEXT-012.26 partial: added shield, heal, revive and death to animated hitpoint trace. 72/72 boss fixtures match expanded health-event sequence (838 heals, 403 shields, 25 deaths; no revives or extra heals in sample). 70/70 tests. Buff lifecycle, instant pages, revive coverage and API wiring pending; gate closed.

NEXT-012.27 partial: animated visible buff add/remove events, stack count, counted shield versus numeric shield event ordering, death cleanup. 72/72 expanded event comparisons (6831 adds, 407 removes), 372/372 final metrics, 70/70 tests. Instant pages, revive cleanup and dedicated expiration/refresh coverage pending. Gate closed.

NEXT-012.28 partial: ordered round-start, pre-turn instant and round-end health/buff event pages; revive cleanup emits visible buff removal; dead actor after pre-turn trigger cannot act. 72/72 full selected event page sequences, 372/372 final metrics, 70/70 tests. Dedicated revive fixtures, description events, report metadata and API pending. Gate closed.

NEXT-012.28.1: integrated description event types 23/24 into report pages; corrected instant skill extra flag inheritance. 72/72 boss page sequences including 11214 description events; 15/15 synthetic revive scenarios with original skill IDs 1150530,1350130,1355310 (10 actual revives, boosted enemy HP and initially dead ally). 387/387 final metrics, 70/70 tests. Campaign bosses, full report metadata and API pending. Gate closed.

NEXT-012.29: original MapBase inventory: 2241 type-1 campaign maps, none marked IsBossBattle; 400 type-3 maps marked IsBossBattle. Sampled 24 maps of each, two synthetic six-hero formations, three seeds, original Unit.stage defenders without overrides. 288/288 final metrics and selected report event pages, cumulative 675 unique fixtures, 70/70 tests. Not exhaustive map coverage; handler progression, report metadata and API remain pending. Gate closed.

NEXT-012.30 partial: authenticated POST /v1/battle/preview uses server-owned formation, original Unit.stage export for 2241 maps, server RNG, ordered pages and summary. Stage lock and 12/min/account rate limit. No rewards or progression mutation. 71/71 tests, deployed isolated API. JSON data file avoids TypeScript heap exhaustion. Full report metadata, authoritative progression and acceptance pending; parityReady remains false.

NEXT-012.30.1 partial: migration 9 persistent challenge reports, single pending battle, transactional settlement and first-clear uniqueness, idempotent retries, original 2241 MapAdventure reward/level/next records, XP and level rewards, intelligence cap. Integration test concurrent settlement and replay, 71/71 tests. Deployed isolated API. Idle settlement, module unlocks, cancel/recovery endpoints, retention and full acceptance remain pending; parityReady false.

NEXT-012.30.2: authenticated pending report recovery and battle-ID-specific cancellation, serialized with settlement using profile row lock. Tested report equality, account isolation, stale cancellation, replacement, repeated cancellation, no reward/progress changes. 72/72 tests, deployed API. Recovery returns full report from beginning, not client playback timestamp. Idle/module integration, retention and acceptance pending.

NEXT-012.31 partial acceptance: reran 675/675 fixtures with all available comparison fields, 72/72 tests. Added per-page HP/death/visible buff snapshots and API finalPage type 99. Snapshot parity not yet compared. 17 diagnostic categories require classification; event Params, RoundSkills/RoundBuffId, hero metadata, idle/module integration and retention pending. Gate remains closed.

NEXT-012.31.1: original per-page HeroStatus differential export, 16771/16771 snapshots across 375 existing fixtures (72 alliance, 144 campaign, 144 type3, 15 revive). HP, max HP, death and visible buff IDs/counts match; buff ordering normalized. Reusable comparator and four export scripts saved. Remaining report metadata/Params and diagnostic classification pending. Gate closed.

NEXT-012.31.2: extra damage event Params carries source actor ID, empty params normalized for other events. 39114/39114 events across 72 alliance fixtures match including Params. All 17 observed diagnostic categories classified against reference fallback: 14 start effects skipped, 3 conditions false; diagnostics retained, not proof of original commercial engine completeness. 72/72 tests, isolated API deployed. Remaining round metadata, hero identity, broader Params checks, idle/modules and retention. Gate closed.

NEXT-012.31.3 partial: roundSkills first ready active per living unit, roundBuffId=0 for tested campaign/alliance maps. 1080/1080 original round metadata comparisons, 72/72 tests. Added hero report metadata with original monster sid/star/skin/skills export for 2241 maps and initial/final stats. Hero metadata shape integration-tested, not fully differential. Nonempty MapType.RoundBuff exists (e.g. type4), application not implemented; explicit remaining gate item. API deployed.

NEXT-012.31.3.1: optional round buff schedule applied before event501, living units sorted by ID, unchecked application. Original ten map types share ten escalating 601 buffs at rounds6-15. Six synthetic 15-round map7 fixtures match final metrics, event pages and all 60 nonzero round buff IDs; 72/72 tests. Campaign API unchanged schedule empty; future noncampaign routes must supply schedule. Generic arbitrary round buff effects not verified. Gate remains closed.

NEXT-012.31.4 partial: migration10 persistent idle points/rewards and unlocked modules. First clear settles old-stage rates before stage change in same transaction; winning settlement refreshes eligible modules. Original config exported; base non-VIP rates and weighted random libraries supported. 72/72 tests including 10-minute accrual and replay invariance. VIP/tower/highest-power history, claim/quick battle API and full differential economy tests remain NEXT019/014; module initial refresh pending. Reference idle formula itself is approximate per source. API deployed.

NEXT-012.31.4.1: independent regression tests for split idle accrual, fractional carry, zero-minute stage change, strict module threshold 1053, 720-minute cap and idempotent module refresh. 75/75 tests. Test fixture initializes profile before refresh (lazy profile creation). No runtime changes; VIP/claim and full module lifecycle remain later stages.

NEXT-012.31.4.2: compact full report to archived marker transactionally on settlement, cancellation or replacement; pending report remains intact, settlement receipt and battle ID retained for retry/expired semantics. No historical bulk cleanup, no row deletion, receipt growth remains; long-term retention policy requires separate decision. 75/75 tests including compacted reports and existing recovery/isolation/idempotency. API deployed.

NEXT-012.31.5 partial acceptance: 681/681 unique reference fixtures, 16771/16771 status snapshots, 39114/39114 Params events, 75/75 tests. Fixed comparator to filter actual events by historical fixture event scope (no simulation change). Remaining hero identity differential, round metadata regression and broader Params coverage before gate; noncampaign and visual integration later. No claim of commercial engine completeness.

NEXT-012.31.5.1: extracted shared reportHeroes serializer; 375 existing reference battles checked for 3132/3132 hero records (18 fields), 2131/2131 round-start metadata records and 68712/68712 events including Params. 75/75 tests; API deployed. Tested reference battle/report scope accepted for NEXT013 visual integration; full commercial parity, player modifiers, noncampaign routes and visual acceptance remain unverified; parityReady stays false.

NEXT-013.1 partial: authenticated report client challenge/pending/cancel/settle, ordered event inspection and authoritative HP snapshots in technical campaign screen, old animation demo retained separately. TypeScript/Vite build and HTTP200 verified; browser interaction and Pixi scene binding pending. No client damage calculation.

NEXT-013.1.1 partial: server report drives original Spine model selection, ActionIndex timeline animation and indexed hit timing, target damage labels and death/revive visibility, authoritative page snapshots. Manual page advance waits for animation completion. Temporary layout/background, missing timeline fallback, no original VFX or browser acceptance yet. TypeScript/Vite and HTTP200 verified.

NEXT-013.2 partial: recovered 19 original BattleBg WebP assets by UUID/version, verified hashes and image decode, all 2241 campaign maps covered. Ported BattleHelper station map, camp orientation and original .875 avatar scale, depth sorting, 1080x1920 viewport with centered 2520 background. Viewport origin and crop provisional, visual browser acceptance pending. Build and HTTP200 verified.

NEXT-013.3 partial: corrected one-based ActionIndex from AJBattleViewPort/Skills.hit_count; all PlayAction timeline events, MoveTo/MoveBack reference coordinates, quartic easing and blink thirds, cleanup of motion frames, stable fallback hit timing. 8/8 pure motion assertions, TypeScript/Vite and HTTP200. Browser acceptance, common skill models, death animation and VFX remain pending.

NEXT-013.3.1 partial: original AJBattleActor death opacity sequence 1000ms, revive delay/fade 500ms, hurt return 200ms, per-unit tween cancellation and authoritative snapshot reconciliation. 9/9 lifecycle assertions, TypeScript/Vite and HTTP200. Common Core/Pet model lookup and browser acceptance remain pending.

NEXT-013.3.2 partial: exported 249 Core/Pet skill mappings and 63 original timelines, client selects CoreModel and one-based ActionIndex. Angel actor assets and common skill VFX remain pending; no browser acceptance. Build and public manifest verified. Next NEXT-013.4.1.

NEXT-013.4.1 partial: original Spine effects types 2/6/8 loaded per action before playback, timed layers, hit target selection, offsets and cleanup. Team/multirow references approximate; common assets, projectiles and browser acceptance pending. TypeScript/Vite and HTTP200 verified.

NEXT-013.4.2 partial: original type7 Spine projectiles per server target, linear flight, rotation, original duration, layer and cleanup. Target HUD offset temporarily 90px; common effect assets and browser acceptance pending. TypeScript/Vite and HTTP200. Next 013.4.3.

NEXT-013.4.3 partial: original type9 dark_screen (190/255, 200ms fades) and shock_screen (30ms, 6px vertical/3px horizontal approximate deterministic shake), 967 hero timeline events. TypeScript/Vite HTTP200. Browser acceptance pending; next sound.

NEXT-013.4.4 partial: 1669/1733 original sound events mapped through bundle dependencies, 328 unique clips, timeline playback and volume slider. 64 unresolved events, browser autoplay and audible acceptance pending. TypeScript/Vite and HTTP200. Next NEXT-013.5 HUD.

NEXT-013.5.1 partial: per-actor HP bars, buff count, damage/heal/crit colors, event-based approximate HP with authoritative page reconciliation. Fixed HUD height 175px, energy absent from report, original buff icons and visual acceptance pending. TypeScript/Vite HTTP200.

2026-11-25 NEXT-013 closed via D-011 owner visual acceptance. NEXT-014.1 partial: campaign-chapters export (56/30, orphan 105701), GET /v1/campaign, CampaignScreen, City nav «Кампания», 77/77 tests, testtest publish.
2026-11-25 NEXT-014.1.1: fixed TypeError buffs not iterable — report.heroes lacked buffs; HUD init crashed after first unit so enemies missing. Normalized buffs in validateReport/createHud/applyHealth. reports/NEXT-014.1.1-*.

2026-11-25 NEXT-014.2: world map dual-view, MapWorld locales, worldStatus API, 81/81 tests, publish. reports/NEXT-014.2-*.

2026-11-25 NEXT-014.3: map guide RU lines + StoryChapter tab + StoryDialog; 82/82 tests; publish. reports/NEXT-014.3-*.

2026-11-25 NEXT-014.4: GuideGroup tutorial sequencing + player_guide_groups; 83/83 tests; publish. reports/NEXT-014.4-*.

2026-11-25 NEXT-014.5–014.14: boss Type=2, enemy/reward preview, modules, WinBoard, campaignComplete, chapter heros, stage labels, tutorial skip, item names; 84/84 tests; publish. reports/NEXT-014.5-14-*.

2026-11-25 Plan A: 014 tails + NEXT-015 inventory MVP + settle white-screen hotfix; 86/86; publish. reports/NEXT-014-tails-015-*.

2026-11-27: isolated PostgreSQL 16/Redis 7 sequential integration suite: 144 PASS, 0 FAIL, 0 SKIP, 37.278 seconds, Termalin job 8j4mmuos8w exit 0. Added integration-db GitHub Actions job; remote run pending.

2026-11-27 NEXT-015.3 full server regression in ephemeral isolated PostgreSQL/Redis: 146/146 PASS, 0 fail/skip, 38.074s, Termalin job rftridjsn1 exit 0. Release prod compose and compose-all with server authorization 401 unauthenticated; browser mocked UI 3/3 PASS.

2026-11-27 NEXT-015.4 original locked/random boxes: source tables ItemConsume 1898/CardSummonType 611/CardRandomLib 699, four types 158+363+3+2; 19 missing source refs globally but none active for these boxes; transactional API + client and isolated PostgreSQL/Redis 149/149 PASS; reports/NEXT-015.4-original-boxes-2026-11-27.md. Next: NEXT-020.2 achievements.

2026-11-27 NEXT-015.4 /sexyidle/ published, API /ready true and HTTP200; browser UI mocked API at 320/390/768 PASS, isolated server QA 149/149 PASS, before-deploy PostgreSQL backup /var/backups/rockbogini-next-pre-boxes-20261127.dump. GitHub CI pending.

2026-11-27 NEXT-020.2 main story: exact 26 original NewbieMainTask IDs and TaskBase rewards from source; server level/power/map/hero state progression, real quick battle event, one-time transaction claims and Story UI tab. 4 PioneeringAchievement rows extracted, competitive conditions OPEN. 151/151 isolated DB tests PASS and mobile 320/390/768 with real API PASS. Reports: reports/NEXT-020.2-main-story-quests-2026-11-27.md. Backup /var/backups/rockbogini-next-pre-newbie-tasks-20261127.dump.
