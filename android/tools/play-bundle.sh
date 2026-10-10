#!/bin/bash
# Builds the signed release AAB with the upload key kept in 1Password (Agent Runtime).
# Usage: ~/.local/bin/oprun --with-op-token android/tools/play-bundle.sh android <out.aab>
set -euo pipefail
ANDROID="$1"; OUT="$2"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
REF="op://Agent Runtime/Remote Sessions Android - Play upload key"
op read --force --out-file "$W/upload.keystore" "$REF/keystore" >/dev/null
export ORG_GRADLE_PROJECT_REMOTE_SESSIONS_KEYSTORE="$W/upload.keystore"
export ORG_GRADLE_PROJECT_REMOTE_SESSIONS_STORE_PASSWORD="$(op read --no-newline "$REF/password")"
export ORG_GRADLE_PROJECT_REMOTE_SESSIONS_KEY_PASSWORD="$ORG_GRADLE_PROJECT_REMOTE_SESSIONS_STORE_PASSWORD"
export ORG_GRADLE_PROJECT_REMOTE_SESSIONS_KEY_ALIAS=upload
export JAVA_HOME="${JAVA_HOME:-$HOME/.gradle/jdks/eclipse_adoptium-21-aarch64-os_x.2/jdk-21.0.7+6/Contents/Home}"
cd "$ANDROID"
./gradlew -q testDebugUnitTest bundleRelease > "$W/gradle.log" 2>&1 || { grep -E "^e:|error|FAIL" "$W/gradle.log" | head; exit 1; }
cp app/build/outputs/bundle/release/app-release.aab "$OUT"
"$JAVA_HOME/bin/jarsigner" -verify "$OUT" | tail -1
