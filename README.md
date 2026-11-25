# RockBogini Next
Current development snapshot, not a finished game.

## Clone → VPS
A fresh `git clone` of this repo is enough to run **RockBogini Next** (client assets + API). You do **not** need the local `runtime/` tree for day-to-day play or publish.

| In GitHub | Purpose |
|---|---|
| `pixi-client/` | Next client (code + Spine models, effects, UI, battle audio, **item icons**, …) |
| `next-server/` | Fastify API, Docker Compose, exported game configs under `data/` |
| `docs/`, `reports/` | Roadmap / evidence |

| Not in GitHub (VPS-only extract) | Purpose |
|---|---|
| `runtime/` | Original Queen-Blade client dump (~6 GB): Cocos assets + protobuf configs. Used only as a **source** to re-export icons/configs when inventing new imports. Optional; ignored by `.gitignore`. |
| `decompiled/`, `next-audit/` | Reverse-engineering / Elixir reference. Not required to run Next. |

Requirements: Linux VPS, Docker Engine, Compose v2.20+, OpenSSL.
Run from repository root: `bash next/install.sh`. Open http://SERVER:8080.
Set WEB_PORT to change the web port. API uses loopback 18991; choose a different host port in next-server/compose.yaml if occupied.
For public production use configure HTTPS via a reverse proxy. Fresh database; no live player data or secrets included.
See [ROADMAP](docs/ROADMAP.md). Verify redistribution rights before reuse.
