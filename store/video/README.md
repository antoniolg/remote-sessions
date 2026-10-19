# Launch video and store previews

| File | Format | Use |
| --- | --- | --- |
| `launch-es.mp4`, `launch-en.mp4` | 1920×1080, 30 fps, 30 s | Launch video (main version): social posts, website, YouTube |
| `launch-es-vertical.mp4`, `launch-en-vertical.mp4` | 1080×1920, 30 fps, 30 s | Reels, Shorts, TikTok, stories |
| `appstore-preview-es.mp4`, `appstore-preview-en.mp4` | 886×1920, 30 fps, 24 s, H.264 High@4.0 at ~11 Mbps, AAC 256 kbps 48 kHz stereo | App Store app preview for 6.9"/6.7" iPhones. Smaller iPhones use it scaled |
| `play-promo-es.mp4`, `play-promo-en.mp4` | 1920×1080, 30 fps, 30 s | Google Play promo video, with the Android app (Play takes a YouTube URL) |

The rendered files are not in git (about 120 MB): `pnpm render` in `tools/` builds them again.
All have the audio mastered to −14 LUFS integrated and −1 dBTP. The story: Claude Code is halfway through a task and
you have to leave → your conversations on the phone, with their state → Connect → continue in the Claude app → "+"
to start one in any folder → closing card (free, open source, no accounts, install command, store badges, URL).

## Content rules

- Only made-up conversations: the apps' demo data with a debug-only video mode (`REMOTE_SESSIONS_SCREEN=video` on
  iOS, `--ez video true` on Android) that shows the three conversation states, a computer name instead of "Demo" and
  keeps "Starting Remote Control…" on screen.
- The Claude app screen is a generic mock, not Anthropic's UI. The closing card says that Remote Sessions is not an
  official Anthropic product and that Claude and Claude Code are trademarks of Anthropic.
- The App Store previews only show the app's own screens: no device frames, other apps or other platforms.

## Publishing

**App Store.** Previews go with a version, and 1.0 is in review: add them to the next version instead.

1. App Store Connect → Remote Sessions → the new iOS version → Previews and Screenshots → iPhone 6.9" Display.
2. Upload `appstore-preview-es.mp4` in Spanish (Spain) and `appstore-preview-en.mp4` in English (U.S.).
3. Optionally pick the poster frame (default: 5 s). Processing can take up to 24 hours.

**Google Play.** The listing takes a YouTube URL, not a file.

1. Upload `play-promo-es.mp4` and `play-promo-en.mp4` to YouTube as Public or Unlisted (not Private), with ads off and
   no age restriction. Uploaded as Unlisted to the DevExpert channel on 2026-10-19:
   [Spanish](https://www.youtube.com/watch?v=lX80U3IhQvU) and [English](https://www.youtube.com/watch?v=yhLPlD4WJQE).
2. Play Console → Remote Sessions → Grow users → Store presence → Main store listing → Video: paste the English URL,
   and the Spanish one in the es-ES translation.
3. Save and send the changes for review.

## How it's made

Everything lives in `tools/`, a [Remotion](https://www.remotion.dev) project (`src/`, compositions in `src/Root.tsx`)
whose inputs are in `tools/public/`:

- `cap/`: screen recordings converted to 30 fps (`ffmpeg -vf fps=30`) and stills.
  - iOS: Debug build on an iPhone 17 Pro Max simulator (iOS 27, 1320×2868), dark mode, status bar overridden to
    9:41 with full battery and signal (`xcrun simctl status_bar … override`). The app is launched with
    `SIMCTL_CHILD_REMOTE_SESSIONS_SCREEN=video xcrun simctl launch … -AppleLanguages "(es)" -AppleLocale es_ES`, and
    each take is recorded with `xcrun simctl io <udid> recordVideo --codec=h264`:
    - connect: first conversation → Connect;
    - new: + → Choose another folder → Projects → landing-page → Start here.
    The onboarding stills come from `REMOTE_SESSIONS_SCREEN=welcome|install`.
  - Android: `scripts/capture-android.sh es-ES es` on the `Medium_Phone_API_36.1` emulator.
  - `src/footage.ts` holds the frame ranges and tap positions of each take, found with
    `ffmpeg -vf freezedetect=n=0.0008:d=0.2`. They belong to these recordings: check them after recording again.
- `audio/`:
  - `vo-<lang>-<n>.wav`: the voice-over, from `scripts/voiceover.py` (Gemini TTS, Castilian Spanish
    "Commercial Voiceover 7" and US English "Nika").
  - `music-source.mp3`: generated with Lyria 3.5 through the Gemini API (instrumental, 123 BPM). `scripts/music.sh`
    cuts it on the beat into `music.wav` (30 s) and `music-appstore.wav` (24 s).
  - `tap.wav`, `whoosh.wav` and `chime.wav`: from `scripts/sfx.py`.
- `img/`: the app icon and the store badges.

`src/timeline.json` places the scenes, voice-over lines and caption cues; the scene cuts sit on the music's beats.

```bash
cd store/video/tools && pnpm install && pnpm render                   # every file above
pnpm render launch-es appstore-preview-en                             # or only some of them
pnpm studio                                                           # preview and tweak in the browser
```

`scripts/render.mjs` renders each composition with Remotion and masters it with a two-pass `loudnorm`. The App Store
files are also re-encoded to H.264 High@4.0.
