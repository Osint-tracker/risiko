#!/usr/bin/env bash
# ubuntu-24.04 already provides the Android command-line tools.
set -euo pipefail
task_sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
task_manager="$task_sdk/cmdline-tools/latest/bin/sdkmanager"
mkdir -p artifacts/logs
if [[ -z "$task_sdk" || ! -x "$task_manager" ]]; then
  echo 'SDK Android preinstallato non trovato: verificare ANDROID_HOME e cmdline-tools/latest/bin/sdkmanager.' >&2
  exit 1
fi
export ANDROID_HOME="$task_sdk"
export ANDROID_SDK_ROOT="$task_sdk"
"$task_manager" --version
# License text goes into a downloadable file instead of flooding the job page.
# yes can exit with SIGPIPE when sdkmanager closes stdin: check sdkmanager's
# status explicitly, never mask a real failure with "|| true".
set +e
yes | "$task_manager" --licenses > artifacts/logs/android-licenses.log 2>&1
task_status="${PIPESTATUS[1]}"
set -e
if [[ "$task_status" != 0 ]]; then
  tail -n 50 artifacts/logs/android-licenses.log >&2
  exit "$task_status"
fi
echo 'Licenze SDK verificate. Testo completo in android-licenses.log.'
"$task_manager" 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
