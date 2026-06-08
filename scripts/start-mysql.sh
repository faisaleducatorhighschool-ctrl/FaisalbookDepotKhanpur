#!/usr/bin/env bash
# Dev-only local MariaDB/MySQL server for the Replit preview environment.
# Production deploys to Hostinger MySQL via DATABASE_URL and does NOT use this.
set -euo pipefail

ROOT="/home/runner/workspace"
DATADIR="$ROOT/.local/mysql/data"
RUNDIR="$ROOT/.local/mysql/run"
SOCK="$RUNDIR/mysql.sock"
PORT="${MYSQL_PORT:-3306}"

MARIADBD="$(readlink -f "$(command -v mariadbd)")"
BASEDIR="$(dirname "$(dirname "$MARIADBD")")"
SHARE="$BASEDIR/share/mysql"

mkdir -p "$DATADIR" "$RUNDIR"

if [ ! -d "$DATADIR/mysql" ]; then
  echo "[start-mysql] bootstrapping data directory at $DATADIR"
  BOOT="$(mktemp)"
  {
    printf "CREATE DATABASE IF NOT EXISTS mysql;\nUSE mysql;\n"
    cat "$SHARE/mysql_system_tables.sql" \
        "$SHARE/mysql_system_tables_data.sql" \
        "$SHARE/fill_help_tables.sql" \
        "$SHARE/maria_add_gis_sp_bootstrap.sql"
    printf "\nCREATE DATABASE IF NOT EXISTS erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n"
    # Dev-only: allow passwordless root over TCP from localhost so mysql2 can connect.
    printf "CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '';\n"
    printf "GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;\n"
    printf "CREATE USER IF NOT EXISTS 'root'@'%%' IDENTIFIED BY '';\n"
    printf "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%%' WITH GRANT OPTION;\n"
    printf "FLUSH PRIVILEGES;\n"
  } > "$BOOT"
  # Retry bootstrap: the sandbox occasionally fails to spawn the process.
  ok=0
  for i in 1 2 3 4 5; do
    if mariadbd --no-defaults --bootstrap \
        --datadir="$DATADIR" --basedir="$BASEDIR" < "$BOOT"; then
      ok=1; break
    fi
    echo "[start-mysql] bootstrap attempt $i failed, retrying..."
    sleep 1
  done
  rm -f "$BOOT"
  if [ "$ok" != "1" ]; then
    echo "[start-mysql] bootstrap failed after retries"; exit 1
  fi
  echo "[start-mysql] bootstrap complete"
fi

echo "[start-mysql] starting mariadbd on 127.0.0.1:$PORT (socket $SOCK)"
exec mariadbd --no-defaults \
  --datadir="$DATADIR" --basedir="$BASEDIR" \
  --socket="$SOCK" --port="$PORT" \
  --bind-address=127.0.0.1 \
  --pid-file="$RUNDIR/mysql.pid" \
  --skip-name-resolve
