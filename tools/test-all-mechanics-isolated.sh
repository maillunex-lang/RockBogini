#!/usr/bin/env bash
set -euo pipefail
cd /home/gamedev/rocbogini
p="$(openssl rand -hex 24)"
secret="$(openssl rand -hex 32)"
db="rockbogini-mechanics-qa-db"
redis="rockbogini-mechanics-qa-redis"
trap 'docker stop -t 2 "$db" "$redis" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --name "$db" --network rockbogini-next_private --tmpfs /var/lib/postgresql/data:rw,size=512m -e POSTGRES_DB=rockbogini_next -e POSTGRES_USER=rockbogini_next -e POSTGRES_PASSWORD="$p" postgres:16-alpine >/dev/null
docker run -d --rm --name "$redis" --network rockbogini-next_private redis:7-alpine redis-server --save "" --appendonly no >/dev/null
for i in $(seq 1 35); do
 if docker exec "$db" pg_isready -U rockbogini_next -d rockbogini_next >/dev/null 2>&1 && docker exec "$redis" redis-cli ping >/dev/null 2>&1; then break; fi
 sleep 1
done
docker run --rm --network rockbogini-next_private --entrypoint sh -v /home/gamedev/rocbogini/next-server:/app:ro -w /app -e PGHOST="$db" -e NEXT_DB_PASSWORD="$p" -e REDIS_URL="redis://$redis:6379" -e NEXT_RECOVERY_SECRET="$secret" rockbogini-next-api:latest -c 'node --test --test-concurrency=1 dist/test/*.test.js'
