#!/bin/bash
# Publishes the tagged release: signs and notarizes the macOS binaries, then runs GoReleaser.
# Usage (from the repo root, on the vX.Y.Z tag): ~/.local/bin/oprun --with-op-token scripts/release.sh [goreleaser flags]
set -euo pipefail
REF="op://Agent Runtime/Remote Sessions - Developer ID Application"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT

op read --force --out-file "$W/devid.p12" "$REF/p12" >/dev/null
export MACOS_SIGN_P12="$W/devid.p12"
MACOS_SIGN_PASSWORD="$(op read --no-newline "$REF/password")"
export MACOS_SIGN_PASSWORD

# Notarization uses the App Store Connect API key of the iOS tools (ASC_KEY_ID, ASC_ISSUER_ID).
set -a; source ios/tools/asc.env; set +a
export MACOS_NOTARY_KEY_ID="$ASC_KEY_ID" MACOS_NOTARY_ISSUER_ID="$ASC_ISSUER_ID"
export MACOS_NOTARY_KEY="$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8"
GITHUB_TOKEN="${GITHUB_TOKEN:-$(gh auth token)}"
export GITHUB_TOKEN

goreleaser release --clean "$@"
