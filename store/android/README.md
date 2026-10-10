# Google Play graphics

| File | Size | Notes |
| --- | --- | --- |
| `icon-512.png` | 512×512, 32-bit RGBA | Full-bleed #D97757 square with the white laptop + phone glyph (Play applies the mask) |
| `feature-graphic.png` | 1024×500, RGB (no alpha) | Dark-to-brand orange gradient, glyph on the left, "Remote Sessions" + tagline |
| `screenshots/<locale>/01-list.png` | 1080×2400 | Conversations list (demo mode) |
| `screenshots/<locale>/02-detail.png` | 1080×2400 | Conversation detail with the Connect button (demo mode) |
| `screenshots/<locale>/03-install.png` | 1080×2400 | Onboarding "Install the server", macOS selected |
| `screenshots/<locale>/04-welcome.png` | 1080×2400 | Onboarding welcome |
| `screenshots/<locale>/05-settings.png` | 1080×2400 | Settings in demo mode (optional) |

Locales: `en-US`, `es-ES`. Screenshots are 24-bit PNG (no alpha), dark theme, demo-mode data only.

## How they were produced

- Icon and feature graphic: `swift store/android/tools/render.swift store/android`. The script draws the
  glyph paths from `android/app/src/main/res/drawable/ic_launcher_foreground.xml` with Core Graphics and the
  text with AppKit (system font).
- Screenshots: debug build (`./gradlew installDebug`) on the `Medium_Phone_API_36.1` emulator (1080×2400,
  420 dpi), system dark mode, SystemUI demo mode for a clean status bar (12:00, full battery and Wi-Fi, no
  notifications), per-app locale via `cmd locale set-app-locales`. Run
  `store/android/tools/capture-screenshots.sh <locale>`; its header lists the status bar setup and the
  alpha-stripping step.
