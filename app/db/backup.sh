#!/usr/bin/env bash
# ============================================================================
# Aurora — Backup do banco de dados (Linux / macOS)
#
# Uso:
#   chmod +x app/db/backup.sh
#   ./app/db/backup.sh
#
# Deteta automaticamente:
#   • DATABASE_URL definida  → PostgreSQL via pg_dump
#   • Caso contrário         → cópia do arquivo SQLite (clinica.db)
#
# Os backups são gravados em ./backups com retenção configurável.
# ============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${APP_DIR}/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [[ -n "${DATABASE_URL:-}" ]]; then
    # -------------------- PostgreSQL via pg_dump --------------------
    PG_DUMP="${PG_DUMP_PATH:-pg_dump}"
    if ! command -v "$PG_DUMP" >/dev/null 2>&1; then
        echo "ERRO: DATABASE_URL está definida mas pg_dump não foi encontrado." >&2
        echo "Defina PG_DUMP_PATH ou instale o PostgreSQL Client." >&2
        exit 1
    fi
    DUMP_FILE="$BACKUP_DIR/aurora-$TIMESTAMP.sql"
    echo "[backup] Iniciando dump PostgreSQL → $DUMP_FILE"
    "$PG_DUMP" "$DATABASE_URL" -f "$DUMP_FILE"
    echo "[backup] Dump concluído: $DUMP_FILE"
else
    # -------------------- SQLite: cópia do arquivo --------------------
    DB_FILE="$APP_DIR/data/clinica.db"
    if [[ ! -f "$DB_FILE" ]]; then
        echo "ERRO: Banco SQLite não encontrado em $DB_FILE." >&2
        echo "Rode o app ao menos uma vez para criá-lo." >&2
        exit 1
    fi
    DUMP_FILE="$BACKUP_DIR/aurora-$TIMESTAMP.db"
    echo "[backup] Iniciando cópia SQLite → $DUMP_FILE"
    cp "$DB_FILE" "$DUMP_FILE"
    # Copia WAL/SHM se existirem (não garante consistência a quente; ideal parar o app)
    for ext in -wal -shm; do
        [[ -f "${DB_FILE}${ext}" ]] && cp "${DB_FILE}${ext}" "${DUMP_FILE}${ext}"
    done
    echo "[backup] Cópia concluída: $DUMP_FILE"
fi

# -------------------- Retenção --------------------
echo "[backup] Aplicando retenção de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -type f -mtime "+$RETENTION_DAYS" -print -delete

echo "[backup] Processo finalizado. Backups em: $BACKUP_DIR"
