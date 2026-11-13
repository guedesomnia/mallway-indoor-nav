#!/usr/bin/env bash
# Backup das plantas enviadas pelo editor. Elas vivem SÓ em disco (/var/lib/mallway/public/p/*/floors),
# fora do banco: o pg_dump diário do banco `mallway` não as cobre. Os mapas publicados (latest.json/vN.json)
# são recriados do banco no startup, então não precisam deste backup.
#
# Cron sugerido (mesmo horário do pg_dump da Omnia):  0 3 * * *  /opt/mallway/deploy/backup-plantas.sh
set -euo pipefail

SRC=/var/lib/mallway/public/p
DEST=/var/backups/mallway
KEEP_DAYS=14
STAMP=$(date +%Y%m%d-%H%M)

install -d -m 750 "$DEST"
tar -C "$SRC" --exclude='*/v*.json' --exclude='*/latest.json' -czf "$DEST/plantas-$STAMP.tar.gz" .
chmod 640 "$DEST/plantas-$STAMP.tar.gz"
find "$DEST" -name 'plantas-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "ok: $DEST/plantas-$STAMP.tar.gz"
