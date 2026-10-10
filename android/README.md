# Remote Sessions for Android

Native Android client (Kotlin, Jetpack Compose, Material 3) for the `remote-sessions` server. It lists the
Claude Code conversations of paired computers, shows their latest messages and resumes them with Remote
Control, opening the returned `https://claude.ai/code/session_…` URL (the Claude app handles it as an app link).
The API contract is in [`../docs/API.md`](../docs/API.md).

## Requirements

- JDK 17+ (Android Studio's bundled JBR works): `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
- Android SDK with platform 37 (`local.properties` → `sdk.dir=…`, or `ANDROID_HOME`)

## Commands

```sh
./gradlew testDebugUnitTest   # unit tests (pairing URI, pinning, tool summary, JSON decoding, dates)
./gradlew assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease     # minified; unsigned unless the signing properties below exist
./gradlew installDebug        # install on a connected device/emulator
```

### Release signing

Add to `~/.gradle/gradle.properties` (never to the repo):

```properties
REMOTE_SESSIONS_KEYSTORE=/path/to/release.jks
REMOTE_SESSIONS_STORE_PASSWORD=…
REMOTE_SESSIONS_KEY_ALIAS=…
REMOTE_SESSIONS_KEY_PASSWORD=…
```

## Layout

```
app/src/main/java/com/antonioleiva/remotesessions/
├── MainActivity.kt, RemoteSessionsApp.kt, AppContainer.kt   # entry point and manual DI
├── InstallCommands.kt          # install commands and public links (edit here)
├── data/
│   ├── model/                  # API models, PairedComputer, tool summary
│   ├── pairing/PairingUri.kt   # remotesessions://pair parser
│   ├── net/                    # OkHttp client, certificate pinning, host fallback, mDNS discovery
│   ├── store/                  # DataStore + Android Keystore (AES-GCM) for tokens
│   └── demo/                   # bundled fake sessions for "Probar sin ordenador"
└── ui/                         # Compose screens: onboarding, sessions, detail, connect, settings
```

## Languages

UI text lives in string resources. `values/strings.xml` (English) is the source; translations exist for
es, fr, de, it, pt-BR, ja, ko, zh-CN, zh-TW, ru, nl, tr, pl and id (`values-in`). When adding a language,
also add it to `res/xml/locales_config.xml` (per-app language on Android 13+). Server errors are mapped to
localized messages by their `code` (`ui/common/Errors.kt`); unknown codes show the server's text.

## How it connects

- Trust comes from the pin: a custom `X509TrustManager` accepts only the leaf certificate whose DER SHA-256
  equals the paired `fp`; hostnames are not checked.
- Hosts are tried in order (last working one first) with `GET /health`; the working one is remembered.
  If none answers, the app browses `_remotesessions._tcp` with `NsdManager` and matches the TXT `id`.
- On Android 17+ the app asks for the local network permission (`ACCESS_LOCAL_NETWORK`).
- Pairing: scan the QR, paste the link, or open a `remotesessions://pair?…` link (intent filter).

Test a pairing link on an emulator (the host machine is `10.0.2.2`):

```sh
adb shell "am start -a android.intent.action.VIEW -d 'remotesessions://pair?v=1&id=…&name=Mac&port=8787&hosts=10.0.2.2&token=…&fp=…'"
```

## Release

`tools/play-bundle.sh` builds the signed AAB with the Play upload key stored in 1Password (needs `op` access to the Agent Runtime vault):

```bash
~/.local/bin/oprun --with-op-token android/tools/play-bundle.sh android ~/Downloads/remote-sessions.aab
```

Bump `versionCode` in `app/build.gradle.kts` for every upload.
