#!/usr/bin/env bash
# Keep complete output while preserving the command's failure status.
set -euo pipefail
task_label="$1"
shift
mkdir -p artifacts/logs
task_log="artifacts/logs/${task_label}.log"
set +e
"$@" 2>&1 | tee "$task_log"
task_statuses=("${PIPESTATUS[@]}")
set -e
task_status="${task_statuses[0]}"
if [[ "$task_status" == 0 && "${task_statuses[1]}" != 0 ]]; then
  task_status="${task_statuses[1]}"
fi
if [[ "$task_status" != 0 ]]; then
  echo "::error title=${task_label}::Comando fallito con codice ${task_status}. Log completo: ${task_log} (artifact log-compilazione)."
fi
exit "$task_status"
