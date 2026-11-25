# NEXT-013.5.2 — исследование энергии в бою

## Вывод

В оригинальном боевом HUD **нет общей шкалы энергии героя**. Добавлять имитацию энергии нельзя.

## Доказательства

1. `AJBattlePlayer.js` задаёт `Mp`/`MpMax` только при `HeroInfo.PetId > 0` из `PetEnergy` / `PetEnergyMax`.
2. `AJBattleActor.SetPetMpBarNoAnimation` активен только при наличии `PetId`.
3. `BattleConsts` / hit events не содержат отдельного hero-energy ресурса для обычных юнитов кампании.
4. `GenreEnergy` из NEXT-003 — мета-ресурс (выносливость/активности), не боевой HUD.
5. `next-server` campaign fighters и `reportHeroes` не отдают `PetId`/`PetEnergy`; текущие кампанийные бои без питомцев.

## Решение

Клиент не рисует energy/MP bar в NEXT-013.5.2. Pet MP — отдельная задача при появлении питомцев в отчёте и сервере.
