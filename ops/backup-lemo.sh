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

# ARCHIVE_DIR is the authoritative store and must be a normal local folder.
# It used to be the iCloud Drive folder, but macOS TCC denies a launchd agent
# readdir there (write/unlink by exact path still work), so retention listed
# nothing and silently pruned nothing. Enumeration now happens here.
ARCHIVE_DIR="${ARCHIVE_DIR:-/Users/theodorosiakovou/LemoBackups/archives}"

# MIRROR_DIR keeps the off-machine copy: each archive is written into iCloud
# Drive by exact path, which TCC permits, and surplus copies are deleted by
# exact path too — the list of what to delete comes from ARCHIVE_DIR. Set to
# "" to disable mirroring. A mirror failure warns but never fails the backup:
# a local backup that exists beats no backup at all.
MIRROR_DIR="${MIRROR_DIR-/Users/theodorosiakovou/Library/Mobile Documents/com~apple~CloudDocs/LemoBackups}"

# Overridable so retention can be exercised against a sandbox dir.
STAGING_DIR="${STAGING_DIR:-/Users/theodorosiakovou/.lemo_staging}"   # local, NOT synced, same APFS volume
LOG_DIR="${LOG_DIR:-/Users/theodorosiakovou/LemoBackups}"             # local; matches launchd StandardOutPath
TIMESTAMP=$(/bin/date +%Y-%m-%d_%H-%M)
STAGING_FILE="$STAGING_DIR/lemoapp-${TIMESTAMP}.gz"
BACKUP_FILE="$ARCHIVE_DIR/lemoapp-${TIMESTAMP}.gz"
LOG="$LOG_DIR/backup.log"
FAIL_MARKER="$LOG_DIR/LAST_BACKUP_FAILED"
KEEP="${KEEP:-8}"

/bin/mkdir -p "$ARCHIVE_DIR" "$STAGING_DIR" "$LOG_DIR"

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

# Atomic move into the archive store — a partial file is never visible there.
/bin/mv -f "$STAGING_FILE" "$BACKUP_FILE"

FILE_SIZE=$(/usr/bin/du -sh "$BACKUP_FILE" | /usr/bin/cut -f1)
echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') OK ${TIMESTAMP} size=${FILE_SIZE}" >> "$LOG"
echo "Backup saved: $BACKUP_FILE (${FILE_SIZE})"

# --- off-machine copy ------------------------------------------------------
# Writing by exact path is permitted under TCC even though listing is not, so
# the iCloud copy still happens and still syncs off this machine. Best effort:
# warn on failure, never abort — the local archive is already safely written.
if [[ -n "$MIRROR_DIR" ]]; then
    if /bin/mkdir -p "$MIRROR_DIR" 2>/dev/null \
       && /bin/cp -f "$BACKUP_FILE" "$MIRROR_DIR/lemoapp-${TIMESTAMP}.gz" 2>/dev/null; then
        echo "Mirrored off-machine: $MIRROR_DIR/lemoapp-${TIMESTAMP}.gz"
    else
        echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') ⚠️  MIRROR FAILED — local backup OK, but no off-machine copy at ${MIRROR_DIR}" >> "$LOG"
        echo "Mirror: FAILED (see $LOG)" >&2
    fi
fi

# Success — clear the failure marker and say so, so a recovery is visible too.
if [[ -f "$FAIL_MARKER" ]]; then
    /bin/rm -f "$FAIL_MARKER"
    echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') RECOVERED — backups working again" >> "$LOG"
fi

# --- rolling retention (keep newest $KEEP) ---------------------------------
# Enumerated from ARCHIVE_DIR, which is local and therefore actually listable.
# Ordered by the timestamp in the FILENAME, not mtime: mtime is rewritten by
# iCloud on evict/re-download, so `ls -t` could delete the wrong archive. The
# name lemoapp-YYYY-MM-DD_HH-MM.gz sorts lexicographically = chronologically,
# and the regex skips iCloud conflict copies ("... 2.gz") that would otherwise
# inflate the count and evict a real backup.
# Each deletion is mirrored by exact path, which TCC permits — that is how the
# iCloud copy stays pruned despite never being listed.
if ! /bin/ls -1 "$ARCHIVE_DIR" >/dev/null 2>&1; then
    echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') ⚠️  RETENTION SKIPPED — cannot list ${ARCHIVE_DIR}. Old backups are NOT being pruned." >> "$LOG"
    echo "Retention: SKIPPED — directory not listable (see $LOG)." >&2
else
    COUNT=0
    PRUNED=0
    MIRROR_STUCK=0
    while IFS= read -r OLD; do
        [[ -n "$OLD" ]] || continue
        COUNT=$((COUNT + 1))
        if [[ $COUNT -gt $KEEP ]]; then
            /bin/rm -f "$OLD"
            PRUNED=$((PRUNED + 1))
            echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') DELETED old backup: $OLD" >> "$LOG"
            # Mirror the deletion. Under TCC a launchd agent may delete files it
            # created itself but NOT pre-existing ones, so this can legitimately
            # fail — count it rather than swallowing it.
            if [[ -n "$MIRROR_DIR" ]]; then
                MIRROR_OLD="$MIRROR_DIR/$(/usr/bin/basename "$OLD")"
                if [[ -e "$MIRROR_OLD" ]]; then
                    /bin/rm -f "$MIRROR_OLD" 2>/dev/null || true
                    [[ -e "$MIRROR_OLD" ]] && MIRROR_STUCK=$((MIRROR_STUCK + 1))
                fi
            fi
        fi
    done < <(/bin/ls -1 "$ARCHIVE_DIR"/lemoapp-*.gz 2>/dev/null \
        | /usr/bin/grep -E '/lemoapp-[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}\.gz$' \
        | /usr/bin/sort -r || true)
    echo "Retention: ${COUNT} archive(s) present, keeping newest ${KEEP}, pruned ${PRUNED}."
    if [[ $MIRROR_STUCK -gt 0 ]]; then
        echo "$(/bin/date '+%Y-%m-%d %H:%M:%S') ⚠️  MIRROR PRUNE BLOCKED — ${MIRROR_STUCK} old archive(s) could not be deleted from ${MIRROR_DIR} (macOS denies a launchd agent deleting files it did not create). The off-machine copy will grow until pruned manually or Full Disk Access is granted." >> "$LOG"
        echo "Mirror prune: ${MIRROR_STUCK} file(s) BLOCKED (see $LOG)" >&2
    fi
fi
