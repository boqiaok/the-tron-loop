#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 backups/YYYYMMDDTHHMMSSZ" >&2
  exit 2
fi

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
case "$1" in
  /*) backup_dir=$1 ;;
  *) backup_dir="$project_root/$1" ;;
esac

test -f "$backup_dir/database.dump"
test -f "$backup_dir/media.tar.gz"
test -f "$backup_dir/SHA256SUMS"
(cd "$backup_dir" && shasum -a 256 -c SHA256SUMS)

database_name="the_tron_loop_restore_check_$(date +%s)"
cleanup() {
  docker compose exec -T database dropdb \
    --username=tron_loop --if-exists "$database_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

cd "$project_root"
docker compose exec -T database createdb \
  --username=tron_loop "$database_name"
docker compose exec -T database pg_restore \
  --username=tron_loop \
  --dbname="$database_name" < "$backup_dir/database.dump"

table_count=$(docker compose exec -T database psql \
  --username=tron_loop \
  --dbname="$database_name" \
  --tuples-only \
  --no-align \
  --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")

tar -tzf "$backup_dir/media.tar.gz" >/dev/null
echo "Backup verified by restoring $table_count database tables into a temporary database."
