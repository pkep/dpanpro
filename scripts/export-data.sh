#!/usr/bin/env bash
# ============================================================
# DépanPro – Export des données de la base
# ============================================================
# Génère un dump SQL ré-importable (INSERTs, schéma public uniquement)
# et, en option, un export CSV par table.
#
# Pré-requis :
#   • pg_dump (PostgreSQL >= 14) et psql installés
#   • Variables d'environnement Postgres standard :
#       PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#     (ou bien export DATABASE_URL=postgres://user:pass@host:port/db)
#
# Utilisation :
#   ./scripts/export-data.sh              # dump SQL uniquement
#   ./scripts/export-data.sh --csv        # dump SQL + CSV par table
#   ./scripts/export-data.sh --out /tmp   # change le dossier de sortie
#
# Sortie par défaut : ./exports/<timestamp>/
#   ├── data.sql        ← INSERTs ré-importables (public.*)
#   ├── schema.sql      ← structure (tables, contraintes, index)
#   └── csv/            ← un fichier .csv par table (option --csv)
# ============================================================

set -euo pipefail

OUT_DIR="./exports"
EXPORT_CSV=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --csv)  EXPORT_CSV=true; shift ;;
    --out)  OUT_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $1" >&2; exit 1 ;;
  esac
done

# Si DATABASE_URL est défini, on s'en sert directement
PG_CONN=()
if [[ -n "${DATABASE_URL:-}" ]]; then
  PG_CONN=(--dbname="$DATABASE_URL")
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="${OUT_DIR%/}/${TIMESTAMP}"
mkdir -p "$TARGET"

echo "▶ Export vers : $TARGET"

# ── 1. Dump SQL (data-only, INSERTs) ────────────────────────
echo "  • Génération de data.sql (INSERTs, schéma public)…"
pg_dump "${PG_CONN[@]}" \
  --schema=public \
  --data-only \
  --inserts \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --exclude-table='public.schema_migrations' \
  --file="$TARGET/data.sql"

# ── 2. Dump du schéma (structure uniquement) ────────────────
echo "  • Génération de schema.sql (structure)…"
pg_dump "${PG_CONN[@]}" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="$TARGET/schema.sql"

# ── 3. Export CSV par table (optionnel) ─────────────────────
if $EXPORT_CSV; then
  CSV_DIR="$TARGET/csv"
  mkdir -p "$CSV_DIR"
  echo "  • Export CSV par table dans $CSV_DIR…"

  TABLES=$(psql "${PG_CONN[@]}" -At -c \
    "SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'schema_migrations%'
      ORDER BY tablename;")

  for tbl in $TABLES; do
    echo "      → $tbl"
    psql "${PG_CONN[@]}" -c \
      "\COPY (SELECT * FROM public.\"$tbl\") TO '$CSV_DIR/$tbl.csv' WITH CSV HEADER"
  done
fi

# ── 4. Archive compressée ───────────────────────────────────
ARCHIVE="${TARGET}.tar.gz"
tar -czf "$ARCHIVE" -C "$OUT_DIR" "$TIMESTAMP"
echo "✔ Archive prête : $ARCHIVE"

echo ""
echo "Pour réimporter les données :"
echo "  psql \"\$DATABASE_URL\" -f $TARGET/data.sql"
