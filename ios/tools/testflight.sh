#!/bin/bash
# Archives Claude Remote, exports a signed IPA and uploads it to TestFlight.
# Usage: tools/testflight.sh ipa     -> build/testflight/export/RemoteSessions.ipa
#        tools/testflight.sh upload  -> builds the IPA and uploads it (no prompt)
# Xcode has no account signed in and the API key cannot cloud-sign, so the export signs manually with
# the "Claude Remote App Store" profile (created through the API, installed in ~/Library).
# The build number is a timestamp, so every run is a new TestFlight build.
set -euo pipefail
cd "$(dirname "$0")/.."
target="${1:-ipa}"
# App Store Connect API key ids live outside git, in tools/asc.env (ASC_KEY_ID=…, ASC_ISSUER_ID=…).
[[ -f tools/asc.env ]] && { set -a; source tools/asc.env; set +a; }
TEAM="G9B2SPDPZG"
ASC_KEY_ID="${ASC_KEY_ID:?Set ASC_KEY_ID}"
ASC_ISSUER_ID="${ASC_ISSUER_ID:?Set ASC_ISSUER_ID}"
OUT="build/testflight"
BUILD_NUMBER="$(date +%Y%m%d%H%M)"

ipa() {
	mkdir -p "$OUT"
	for old in "$OUT/RemoteSessions.xcarchive" "$OUT/export"; do [[ -e "$old" ]] && trash "$old"; done
	xcodegen generate --quiet
	# Archive unsigned; the export signs it with the team's distribution certificate.
	xcodebuild -project RemoteSessions.xcodeproj -scheme RemoteSessions -configuration Release \
		-destination 'generic/platform=iOS' -archivePath "$OUT/RemoteSessions.xcarchive" \
		-derivedDataPath "$OUT/DerivedData" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
		CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
		archive >"$OUT/archive.log" 2>&1 || { grep "error:" "$OUT/archive.log" | head; echo "FAIL archive"; return 1; }
	cat >"$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key><string>app-store-connect</string>
	<key>destination</key><string>export</string>
	<key>teamID</key><string>$TEAM</string>
	<key>signingStyle</key><string>manual</string>
	<key>signingCertificate</key><string>Apple Distribution</string>
	<key>provisioningProfiles</key><dict>
		<key>com.antonioleiva.clauderemote</key><string>Claude Remote App Store</string>
	</dict>
	<key>uploadSymbols</key><true/>
	<key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
PLIST
	xcodebuild -exportArchive -archivePath "$OUT/RemoteSessions.xcarchive" -exportPath "$OUT/export" \
		-exportOptionsPlist "$OUT/ExportOptions.plist" \
		>"$OUT/ipa.log" 2>&1 || { grep -i "error" "$OUT/ipa.log" | head; echo "FAIL ipa"; return 1; }
	echo "OK IPA build $BUILD_NUMBER: $OUT/export/RemoteSessions.ipa"
}

upload() {
	ipa
	xcrun altool --upload-app --type ios --file "$OUT/export/RemoteSessions.ipa" \
		--apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
}

case "$target" in
ipa) ipa ;;
upload) upload ;;
*) echo "Uso: $0 ipa|upload"; exit 2 ;;
esac
