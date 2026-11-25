# RockBogini Next
Current development snapshot, not a finished game.

## Clone → any VPS (полная игра Next)
Репозиторий **самодостаточен**: после `git clone` есть клиент (код + Spine, эффекты, звуки, иконки предметов, UI) и API с конфигами. Локальный `runtime/` (~6 GB оригинала) **не нужен**.

```bash
git clone git@github.com:maillunex-lang/RockBogini.git
cd RockBogini
bash install.sh
# открыть http://SERVER:8080  (WEB_PORT=… чтобы сменить порт)
```

| В GitHub | Назначение |
|---|---|
| `pixi-client/` | Next-клиент: код + все игровые ассеты в `public/` (hero-models, skill-effects, item-icons, …) |
| `next-server/` | Fastify API, Docker Compose, экспортированные конфиги в `data/` |
| `compose.yaml`, `install.sh` | Однокомандный подъём web+api |
| `docs/`, `reports/NEXT-*.md` | Дорожная карта / отчёты срезов |

| Не в GitHub (не нужно для запуска) | Назначение |
|---|---|
| `runtime/` | Дамп оригинала Queen-Blade (~6 GB): только источник для редких re-export |
| `decompiled/`, `next-audit/`, `localization/` | Reverse-engineering / локали оригинала |
| `recovered/` | Промежуточные артефакты восстановления |

Requirements: Linux VPS, Docker Engine, Compose v2.20+, OpenSSL.
API на loopback `18991` (см. `next-server/compose.yaml`). Для публичного доступа — HTTPS через reverse proxy.
Свежая БД; живых игроков и секретов в репо нет (`.env` генерируется `install.sh`).
See [ROADMAP](docs/ROADMAP.md). Verify redistribution rights before reuse.
