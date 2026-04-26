#!/usr/bin/env bash
# Run a single vitest file with a hard kill-guard.
#   Usage: scripts/test-guard.sh <path-to-test-file> [timeout-seconds] [rss-mb-cap]
#   Example: scripts/test-guard.sh src/features/boards/Repro1.test.tsx 25 800
#
# Why: the EditableBoardTitle hang produces a runaway microtask loop in the
# Vitest worker which can OOM the host. This wrapper:
#   * launches `npx vitest run <file>` in its own process group
#   * polls every 0.5s for either:
#       - elapsed time > timeout
#       - any descendant process RSS > rss-mb-cap
#     and on either condition, SIGKILLs the entire process group.
#   * always cleans up on exit.
set -u

FILE="${1:?missing test file path}"
TIMEOUT_SEC="${2:-25}"
RSS_MB_CAP="${3:-800}"

cd "$(dirname "$0")/.."

LOG_FILE="$(mktemp -t test-guard-XXXX.log)"
echo "[guard] file=${FILE} timeout=${TIMEOUT_SEC}s rss_cap=${RSS_MB_CAP}MB log=${LOG_FILE}"

# Run vitest in its own process group so we can SIGKILL the whole tree.
set -m
( exec npx vitest run "$FILE" --reporter=verbose --disableConsoleIntercept ) >"$LOG_FILE" 2>&1 &
GROUP_PID=$!
set +m

cleanup() {
  if kill -0 "$GROUP_PID" 2>/dev/null; then
    # Kill the whole group.
    kill -KILL -- -"$GROUP_PID" 2>/dev/null || kill -KILL "$GROUP_PID" 2>/dev/null
  fi
  # Belt-and-suspenders: nuke any vitest/esbuild children we may have spawned in this run.
  pkill -KILL -P "$GROUP_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

START_TS=$(date +%s)
KILLED_REASON=""

while kill -0 "$GROUP_PID" 2>/dev/null; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))

  if [ "$ELAPSED" -ge "$TIMEOUT_SEC" ]; then
    KILLED_REASON="timeout after ${ELAPSED}s"
    break
  fi

  # Sum RSS (KB) of GROUP_PID + descendants.
  TOTAL_KB=$(ps -o rss= -g "$GROUP_PID" 2>/dev/null | awk '{s+=$1} END {print s+0}')
  TOTAL_MB=$((TOTAL_KB / 1024))
  if [ "$TOTAL_MB" -ge "$RSS_MB_CAP" ]; then
    KILLED_REASON="memory cap hit at ${TOTAL_MB}MB"
    break
  fi

  sleep 0.5
done

if [ -n "$KILLED_REASON" ]; then
  echo "[guard] KILLING: ${KILLED_REASON}"
  cleanup
  echo "----- last 80 lines of vitest output -----"
  tail -n 80 "$LOG_FILE" || true
  echo "----- end output -----"
  exit 124
fi

wait "$GROUP_PID"
EXIT=$?
ELAPSED=$(( $(date +%s) - START_TS ))
echo "[guard] exited cleanly in ${ELAPSED}s with code ${EXIT}"
echo "----- last 80 lines of vitest output -----"
tail -n 80 "$LOG_FILE" || true
echo "----- end output -----"
exit "$EXIT"
