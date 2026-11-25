#!/bin/bash
# Publish RockBogini Next to https://rikagro.ru/testtest/
# SINGLE-PROJECT-001: one live instance; prefer hardlinks for immutable assets.
set -euo pipefail
ROOT=/home/gamedev/rocbogini/pixi-client
WWW=/var/www/testtest
STATIC_DIRS=(skill-effects hero-models battle-sounds battle-backgrounds battle-hud profile item-icons landing-portraits recovered-effects squad city library hero)

cd "$ROOT"
# Icons ship in git under public/item-icons. Re-import from runtime/ only if missing
# and the original bundle is present on this machine (optional recovery path).
if [[ ! -f public/item-icons/manifest.json ]] || [[ $(find public/item-icons -name '*.webp' 2>/dev/null | wc -l) -lt 100 ]]; then
  if [[ -d ../runtime/client/G123Live/Queen-Blade/assets/ItemIcon ]]; then
    python3 tools/import_item_icons.py
  else
    echo "warn: item-icons incomplete and runtime ItemIcon bundle missing" >&2
  fi
fi
VITE_NEXT_API_URL=/testtest/api npm run build -- --base=/testtest/

# Reclaim dist duplicates: hardlink immutable public assets instead of second full copy.
for d in "${STATIC_DIRS[@]}"; do
  if [[ -d public/$d ]]; then
    rm -rf "dist/$d"
    cp -al "public/$d" "dist/$d"
  fi
done

mkdir -p "$WWW"
# Code/HTML always refresh
rsync -a --delete dist/assets/ "$WWW/assets/"
rsync -a dist/*.html "$WWW/" 2>/dev/null || true
# Small root json/manifests from dist (exclude large dirs)
rsync -a --include='*.json' --include='*.js' --include='*.css' --exclude='*/' --exclude='assets' dist/ "$WWW/" || true

# Ensure www static dirs hardlink from public (create if missing; replace full copies with hardlinks).
for d in "${STATIC_DIRS[@]}"; do
  if [[ ! -d public/$d ]]; then continue; fi
  if [[ -d $WWW/$d ]]; then
    # If not already hardlinked to public, replace with hardlink tree.
    sample=$(find "public/$d" -type f \( -name '*.png' -o -name '*.webp' -o -name '*.skel' \) | head -1 || true)
    if [[ -n ${sample:-} ]]; then
      base=${sample#public/$d/}
      if [[ -f $WWW/$d/$base ]]; then
        ino_a=$(stat -c %i "$sample")
        ino_b=$(stat -c %i "$WWW/$d/$base")
        if [[ $ino_a != "$ino_b" ]]; then
          rm -rf "$WWW/$d"
          cp -al "public/$d" "$WWW/$d"
        fi
      fi
    fi
  else
    cp -al "public/$d" "$WWW/$d"
  fi
done

curl -fsS https://rikagro.ru/testtest/api/ready
curl -fsS https://rikagro.ru/testtest/ >/dev/null
df -h / | tail -1
