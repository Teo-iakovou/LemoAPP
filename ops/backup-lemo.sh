#!/bin/bash
# -E so the ERR trap fires inside functions too — without it, unexpected
# failures die silently under set -e, which is how 8 runs failed unnoticed.
set -Eeuo pipefail

# launchd starts us with a minimal PATH that does NOT include Homebrew, which
# is why "mongodump: command not found" killed every scheduled run. Binaries
# are called by absolute path below; this PATH is only a safety net.
PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH

MONGODUMP="${MONGODUMP:-/opt/homebrew/bin/mongodump}"

ENV_FILE="/Users/theodorosiakovou/Projects/LemoAPP/barber-backend/.env"
# Overridable so the retention logic can be exercised against a sandbox dir.
CLOUD_DIR="${CLOUD_DIR:-/Users/theodorosiakovou/Library/Mobile Documents/com~apple~CloudDocs/LemoBackups}"
STAGING_DIR="${STAGING_DIR:-/Users/theodorosiakovou/.lemo_staging}"   # local, NOT synced, same APFS volume
LOG_DIR="${LOG_DIR:-/Users/theodorosiakovou/LemoBackups}"             # local; matches launchd StandardOutPath
TIMESTAMP=$(/bin/date +%Y-%m-%d_%H-%M)
STAGING_FILE="$STAGING_DIR/lemoapp-${TIMESTAMP}.gz"
BACKUP_FILE="$CLOUD_DIR/lemoapp-${TIMESTAMP}.gz"
LOG="$LOG_DIR/backup.log"
FAIL_MARKER="$LOG_DIR/LAST_BACKUP_FAILED"
KEEP=8

/bin/mkdir -p "$CLOUD_DIR" "$STAGING_DIR" "$LOG_DIR"

# --- fail loud -------------------------------------------------------------
# Every exit path lands here: a marked line in the log AND a marker file that
# survives until the next success. Silence is the bug we are fixing.
fail() {
    local msg="$1"
    echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') ❌ BACKUP FAILED — ${msg}" >> "$LOG"
    {
        echo "BACKUP FAILED"
        echo "when:    $(/bin/date '+%Y-%m-%d %H:%M:%S')"
        echo "reason:  ${msg}"
        echo "host:    $(/bin/hostname)"
        echo "script:  ${BASH_SOURCE[0]}"
        echo "log:     ${LOG}"
        echo
        echo "This file is created on every failed backup and removed only by"
        echo "the next successful one. If you are reading it, backups are down."
    } > "$FAIL_MARKER"
    echo "BACKUP FAILED — ${msg}" >&2
    exit 1
}
trap 'fail "unexpected error at line ${LINENO} (exit ${?})"' ERR

# --- preflight -------------------------------------------------------------
if [[ ! -x "$MONGODUMP" ]]; then
    fail "mongodump not executable at ${MONGODUMP} (set \$MONGODUMP or reinstall mongodb-database-tools)"
fi

if [[ ! -f "$ENV_FILE" ]]; then
    fail ".env not found at ${ENV_FILE}"
fi

MONGODB_URI=$(/usr/bin/grep -E '^MONGODB_URI=' "$ENV_FILE" | /usr/bin/head -n1 | /usr/bin/cut -d'=' -f2-)
if [[ -z "$MONGODB_URI" ]]; then
    fail "MONGODB_URI not set in ${ENV_FILE}"
fi

# --- dump ------------------------------------------------------------------
# Dump to LOCAL staging first, so iCloud never sees a partial archive.
if ! "$MONGODUMP" --uri="$MONGODB_URI" --gzip --archive="$STAGING_FILE"; then
    /bin/rm -f "$STAGING_FILE"
    fail "mongodump error"
fi

if [[ ! -s "$STAGING_FILE" ]]; then
    /bin/rm -f "$STAGING_FILE"
    fail "staging archive empty"
fi

# Cheap integrity check — a truncated gzip stream is worthless as a restore point.
if ! /usr/bin/gzip -t "$STAGING_FILE" 2>/dev/null; then
    /bin/rm -f "$STAGING_FILE"
    fail "staging archive is not a valid gzip stream"
fi

# Atomic move into the synced folder — iCloud only ever sees the complete file
/bin/mv -f "$STAGING_FILE" "$BACKUP_FILE"

FILE_SIZE=$(/usr/bin/du -sh "$BACKUP_FILE" | /usr/bin/cut -f1)
echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') OK ${TIMESTAMP} size=${FILE_SIZE}" >> "$LOG"
echo "Backup saved: $BACKUP_FILE (${FILE_SIZE})"

# Success — clear the failure marker and say so, so a recovery is visible too.
if [[ -f "$FAIL_MARKER" ]]; then
    /bin/rm -f "$FAIL_MARKER"
    echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') RECOVERED — backups working again" >> "$LOG"
fi

# --- rolling retention on the CLOUD folder (keep newest $KEEP) --------------
# Ordered by the timestamp in the FILENAME, not mtime: this folder is in iCloud
# Drive, and evict/re-download rewrites mtime, which would make `ls -t` delete
# the wrong archive. lemoapp-YYYY-MM-DD_HH-MM.gz sorts lexicographically =
# chronologically. The regex also skips iCloud conflict copies ("... 2.gz"),
# which would otherwise inflate the count and evict a real backup.
# macOS TCC lets a launchd agent WRITE a file into iCloud Drive by exact path,
# but denies listing the directory ("Operation not permitted") unless the
# executable holds Full Disk Access. stat succeeds, readdir does not — so the
# glob quietly matches nothing and retention would prune nothing, forever.
# Never let that pass silently: an unenforced cap is a disk filling up unnoticed.
if ! /bin/ls -1 "$CLOUD_DIR" >/dev/null 2>&1; then
    echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') ⚠️  RETENTION SKIPPED — cannot list ${CLOUD_DIR}. Old backups are NOT being pruned. Grant Full Disk Access to the running binary, or move CLOUD_DIR outside iCloud Drive." >> "$LOG"
    echo "Retention: SKIPPED — directory not listable (see $LOG)." >&2
else
    COUNT=0
    while IFS= read -r OLD; do
        [[ -n "$OLD" ]] || continue
        COUNT=$((COUNT + 1))
        if [[ $COUNT -gt $KEEP ]]; then
            /bin/rm -f "$OLD"
            echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') DELETED old backup: $OLD" >> "$LOG"
        fi
    done < <(/bin/ls -1 "$CLOUD_DIR"/lemoapp-*.gz 2>/dev/null \
        | /usr/bin/grep -E '/lemoapp-[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}\.gz$' \
        | /usr/bin/sort -r || true)
    echo "Retention: ${COUNT} archive(s) present, keeping newest ${KEEP}."
fi
