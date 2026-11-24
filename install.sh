#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v docker >/dev/null
docker compose version
if [ ! -f next-server/.env ]; then
  umask 077
  printf 'NEXT_DB_PASSWORD=%s\nNEXT_RECOVERY_SECRET=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > next-server/.env
fi
docker compose --env-file next-server/.env -p rockbogini-portable up -d --build --wait
