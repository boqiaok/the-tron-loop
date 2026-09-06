#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: CONFIRM_RESTORE=the_tron_loop $0 backups/YYYYMMDDTHHMMSSZ" >&2
  exit 2
fi
if [ "${CONFIRM_RESTORE:-}" != "the_tron_loop" ]; then
  echo "Restore replaces the local database and media. Set CONFIRM_RESTORE=the_tron_loop to continue." >&2
  exit 2
fi

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
case "$1" in
  /*) backup_dir=$1 ;;
  *) backup_dir="$project_root/$1" ;;
esac

"$project_root/infrastructure/backup/verify-backup.sh" "$backup_dir"
cd "$project_root"

docker compose stop server web
docker compose exec -T database dropdb \
  --username=tron_loop --if-exists --force the_tron_loop
docker compose exec -T database createdb \
  --username=tron_loop the_tron_loop
docker compose exec -T database pg_restore \
  --username=tron_loop \
  --dbname=the_tron_loop < "$backup_dir/database.dump"

docker compose run --rm --no-deps \
  -v "$backup_dir:/backup:ro" \
  server sh -c 'find /app/media -mindepth 1 -delete && tar -xzf /backup/media.tar.gz -C /app/media'
docker compose up -d server web
echo "Local database and media restored from $backup_dir"
