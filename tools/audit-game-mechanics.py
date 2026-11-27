#!/usr/bin/env python3
"""Trace original Elixir handler presence to currently shipped TypeScript sources.
This is a source coverage audit, never a claim of gameplay equivalence.
"""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
orig=Path('/home/gamedev/QueensBladeH5/racon2-main/server/lib/racon/game/handlers')
port=root/'next-server/src'
road={r['id']:r for r in json.loads((root/'docs/roadmap.json').read_text())}
categories=[
 ('Герои и развитие',['hero.ex','hero_talent.ex','hero_extra.ex','hero_favor.ex'],['heroes.ts','heroGrowth.ts','heroTalent.ts','heroJob.ts','heroLuck.ts'],['NEXT-010','NEXT-016'],'Завершить профессии, удачу и ограничения роста, проверить эталонные формулы'),
 ('Пошаговые бои',['adventure_battle.ex','team2.ex'],['battleRoutes.ts','battleUnits.ts'],['NEXT-012'],'Открытые модификаторы, статусы и бои за пределами кампании'),
 ('Кампания и история',['adventure_battle.ex','adventure_idle.ex'],['campaignRoutes.ts','campaignChapters.ts','campaignStory.ts'],['NEXT-014'],'Полные сюжетные условия и награды всех локаций требуют приёмки'),
 ('Инвентарь и расходники',['item.ex'],['inventory.ts','itemCatalog.ts'],['NEXT-015'],'Осколки в текущем пакете, затем RandomBox, LockedBox и остальные ConsumeSubtype'),
 ('Экипировка и святые предметы',['item_equip.ex','holy.ex'],['equipment.ts','holy.ts','holyGallery.ts'],['NEXT-017'],'Дополнительная сверка экипировки и кузницы по оригиналу'),
 ('Призыв',['summon.ex','activity_game_summon.ex'],['summon.ts'],['NEXT-018'],'Событийные баннеры, гарантии всех пулов и транзакционная параллельность'),
 ('AFK и магазины',['adventure_idle.ex','mall.ex','vip.ex'],['adventureProgress.ts','shop.ts'],['NEXT-019'],'Дополнительные покупки, VIP-пакеты и ограничения'),
 ('Задания и достижения',['task.ex','task_misc.ex','journal.ex'],['tasks.ts'],['NEXT-020'],'Сюжетные задания и достижения'),
 ('Башни и PvE',['pve_tower.ex','pve_daily_instance.ex','pve_secret.ex','pve_abyss.ex'],[],['NEXT-021'],'Отдельные игровые маршруты башен и подземелий не реализованы'),
 ('PvP и арена',['pvp.ex','team.ex','team2.ex'],[],['NEXT-022'],'Арена, рейтинги и матчмейкинг'),
 ('Гильдии, друзья, почта, чат',['alliance.ex','mail.ex','chat.ex','player_misc_social.ex'],[],['NEXT-022'],'Социальные системы и серверная почта'),
 ('События и монетизация',['activity_game_play.ex','activity_battle_boss.ex','activity_shop.ex','activity_pay.ex'],[],['NEXT-023'],'Активности, сезоны, пропуски, события и платежи'),
 ('Редакторы и администрирование',[],['studioRoutes.ts','studioDrafts.ts'],['NEXT-024','NEXT-025'],'Редакторы содержимого и админка аккаунтов/серверов'),
]
out=[]
for label,originals,ports,stages,gap in categories:
 assert all((orig/x).exists() for x in originals),(label,originals)
 assert all((port/x).exists() for x in ports),(label,ports)
 status=[{'id':s,'status':road[s]['status']} for s in stages]
 out.append({'mechanic':label,'originalHandlers':originals,'portModules':ports,
             'roadmap':status,'knownGap':gap,'note':'Файлы подтверждают наличие кода, но не равнозначность механик оригиналу'})
summary={'date':'2026-11-27','originalHandlerModules':len(list(orig.glob('*.ex'))),
         'portServerModules':len(list(port.glob('*.ts'))),
         'mechanicGroups':len(out),
         'stageStatusTotals':{s:sum(1 for r in road.values() if r['status']==s) for s in ['done','in_progress','pending','deferred']},
         'groups':out}
(root/'reports/NEXT-MECHANICS-2026-11-27.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lines=[
 '# RockBogini: аудит приоритета игровых механик 2026-11-27',
 '',
 'Основа: фактически прочитанные серверные исходники оригинала QueensBladeH5, серверные TypeScript-модули RockBogini и docs/roadmap.json.',
 'Это **аудит наличия реализаций, а не подтверждение полной эквивалентности**. Отсутствие отдельного модуля не доказывает отсутствие каждой функции в иных модулях.',
 f'Оригинальные обработчики: {summary["originalHandlerModules"]} .ex; сервер порта: {summary["portServerModules"]} .ts. Рассмотрено {len(out)} функциональных групп.',
 '',
 '| Механика | Этап и статус | Исходники оригинала | Код порта | Непокрытая часть |',
 '|---|---|---|---|---|',
]
for row in out:
 lines.append('| '+ ' | '.join([
 row['mechanic'],
 ', '.join(s['id'].replace('NEXT-','')+': '+s['status'] for s in row['roadmap']),
 ', '.join(row['originalHandlers'][:4]) or 'Сопоставление не завершено',
 ', '.join(row['portModules'][:4]) or 'Отдельного модуля пока нет',
 row['knownGap'],
 ])+' |')
lines+=['',
 '## Утверждённый порядок выполнения: механики сначала',
 '',
 '1. **NEXT-015.3**: ItemPiece, 218 точных рецептов осколков героев, одиночное/пакетное объединение в транзакции, клиент и E2E.',
 '2. **NEXT-015.4**: ItemConsume RandomBox/LockedBox, эталонные таблицы и атомарная выдача.',
 '3. **NEXT-020.2**: достижения, задания истории и серверное получение наград.',
 '4. **NEXT-016.4**: профессии, талантные ветки, удача, эволюция и проверка серверных условий.',
 '5. **NEXT-021**: режимы PvE, начиная с башни, затем подземелья и боссы.',
 '6. **NEXT-022**: арена/PvP, затем рейтинги, друзья, гильдии, почта и чат.',
 '7. **NEXT-023**: события, сезонность, магазины и ограничения оплаты.',
 '8. **NEXT-024–025**: редакторы игровых данных, админка баланса и серверов.',
 '9. **NEXT-026–028**: визуал 1:1, производительность и финальная приёмка только после функциональных ворот.',
 '',
 '## Ворота приёмки',
 'Исходник → конфигурация → серверная операция (атомарность, авторизация) → тест с изолированной БД → реальный клиентский сценарий → сборка → публикация → GitHub CI → отчёт.',
 'Отдельно держать открытыми непроверенные оригинальные исключения, повторяемость рандома, бои и административные сценарии.',
]
(root/'reports/NEXT-MECHANICS-2026-11-27.md').write_text('\n'.join(lines)+'\n')
print('AUDIT',summary['originalHandlerModules'],'original handler files,',summary['portServerModules'],'port modules;',len(out),'groups')
print('STAGES',summary['stageStatusTotals'])
