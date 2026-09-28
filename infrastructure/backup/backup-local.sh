#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="$project_root/backups/$timestamp"
mkdir -p "$backup_dir"

cd "$project_root"
docker compose exec -T database pg_dump \
  --username=tron_loop \
  --dbname=the_tron_loop \
  --format=custom > "$backup_dir/database.dump"

(cd "$backup_dir" && shasum -a 256 database.dump > SHA256SUMS)
echo "Backup created at $backup_dir"
