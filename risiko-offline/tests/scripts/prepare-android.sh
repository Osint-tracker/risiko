#!/usr/bin/env sh
set -eu
command -v node >/dev/null
java --module jdk.compiler/com.sun.tools.javac.Main -version >/dev/null 2>&1 || { echo 'È necessario un JDK versione 21 con il modulo jdk.compiler.' >&2; exit 1; }
TASK_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$TASK_SDK" ] || { echo 'Imposta ANDROID_HOME sulla directory Android SDK.' >&2; exit 1; }
[ -x "$TASK_SDK/cmdline-tools/latest/bin/sdkmanager" ] || { echo 'Installa Android SDK Command-line Tools (latest).' >&2; exit 1; }
"$TASK_SDK/cmdline-tools/latest/bin/sdkmanager" 'platforms;android-36' 'build-tools;36.0.0' 'platform-tools'
printf 'sdk.dir=%s\n' "$TASK_SDK" > android/local.properties
npm install
npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug)
mkdir -p artifacts
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/risiko-offline-debug.apk
sha256sum artifacts/risiko-offline-debug.apk > artifacts/risiko-offline-debug.apk.sha256
