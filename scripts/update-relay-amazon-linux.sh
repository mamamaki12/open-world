#!/usr/bin/env bash
# Run as ec2-user. Updates executable only; the systemd environment and saved world stay in place.
set -euo pipefail
revision="${1:-main}"
directory=/home/ec2-user/open-world-relay
target="$directory/relay.mjs"
test -f "$target"
temporary=$(mktemp "$directory/relay-update-XXXXXX.mjs")
trap 'rm -f -- "$temporary"' EXIT
curl -fL --retry 2 "https://raw.githubusercontent.com/mamamaki12/open-world/$revision/server/dist/relay.mjs" -o "$temporary"
/usr/bin/node-22 --check "$temporary"
backup="$target.backup-$(date +%Y%m%d-%H%M%S)"
cp -p -- "$target" "$backup"
install -m 644 -- "$temporary" "$target"
if sudo systemctl restart open-world-relay && curl --retry 5 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:8787/health; then
  printf '\nRelay updated. Backup: %s\n' "$backup"
else
  cp -p -- "$backup" "$target"
  sudo systemctl restart open-world-relay
  printf '\nUpdate failed; restored the previous executable.\n' >&2
  exit 1
fi
