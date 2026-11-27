# NEXT-015.3: оригинальное объединение осколков героев
Дата: 2026-11-27. Канонический проект /home/gamedev/rocbogini, публикация https://rikagro.ru/sexyidle/.

## Первоисточник, без придуманных рецептов
- /home/gamedev/QueensBladeH5/racon2-main/client/config/configure/1b4bcf8e18f84fdca76deb523b59d279/ItemPiece: исходный CDN protobuf (base64 + zlib), 523 записи ItemPiece_Config. Конфигурация расшифрована из фактических полей Id 1, RequireCount 2, CardId 4, SubType 8, а также ShowLib/DecomposeItems.
- /home/gamedev/QueensBladeH5/racon2-main/server/lib/racon/game/handlers/item.ex: Req_Item_ComposePiece и Req_Item_OneClickComposePiece, SubType=1 для осколков героев. Эталонный тест server/test/item_test.exs проверяет выдачу CardId как предмета и списание RequireCount.
- Всего 252 записей с SubType=1; у 218 есть CardId>0 и RequireCount>0. Только эти 218 рецептов доступны для объединения. Остальным 34 не придумываем результат.
- Файл next-server/data/item-piece-original.json воспроизводимо извлекается tools/export-original-item-piece.py. Контрольная сумма и примеры в reports/NEXT-015.3-item-piece-source.json.

## Реализация
- next-server/src/itemCatalog.ts: heroPieceRecipe, heroPieceRecipes; клиенту возвращаются точные need/cardId/max.
- next-server/src/inventory.ts: POST /v1/inventory/compose (количество карт) и POST /v1/inventory/compose-all (все пригодные осколки).
- Авторизация обязательна. Обе операции списывают и выдают предметы в одной транзакции PostgreSQL, при нехватке материалов возвращают 409; чужие ресурсы не затрагиваются.
- Картa выдаётся в inventory как CardId. Механизм раскрытия карты в героя (если предусмотрен отдельно оригиналом) не придумывали и в этом подэтапе не меняли.
- pixi-client/src/inventory/InventoryScreen.tsx: отображение рецепта, количество доступных объединений, кнопка объединения и "Объединить все доступные осколки".

## Контроль
- npm --prefix next-server run build: PASS.
- npm --prefix pixi-client run build: PASS.
- Изолированная PostgreSQL16 + Redis7: next-server/test/inventory.test.ts 5/5 PASS, 0 FAIL, 0 SKIP, включая точные рецепты, одиночные/двойные операции, insufficient fragments, массовое объединение и точные остатки.
- Playwright 320x640, 390x844, 768x1024: UI-макеты с перехватом ответа инвентаря и POST на клиентской стороне, 3/3 PASS (кнопки, рецепт, обновление сумки, без переполнения, без JS errors). Это **не** реальный призыв/выдача в рабочей базе.
- Текущий API зарегистрировал маршруты и без авторизации отдаёт 401; readiness true. Клиент опубликован /sexyidle. Для продакшен-публикации создан PostgreSQL pg_dump /var/backups/rockbogini-next-pre-itempiece-20261127.dump; сохранены прошлые скомпилированные модули и Docker image pre-0153.
- Оригинальные графические эффекты слияния/названия некоторых карт не считаются визуально принятыми.

## Далее
NEXT-015.4: оригинальные ItemConsume RandomBox/RandomBoxAutomatically/LockedFixedBox/LockedRandomBox (SubType 2/5/6/7), изучить CardSummonType/CardRandomLib/ShowLib, затем атомарное списание и тесты. Сюжетные достижения NEXT-020.2, профессии NEXT-016, PvE NEXT-021, PvP/соц NEXT-022, события NEXT-023. Визуальный NEXT-026 поставлен после механических ворот.

## Полный регрессионный набор
Termalin job rftridjsn1: изолированная PostgreSQL16/Redis7, последовательные next-server/test/*.test.ts, **146 PASS, 0 FAIL, 0 SKIP**, 38.074s, exit 0. Тестовые контейнеры удалены после выполнения, рабочую БД не использовали.
