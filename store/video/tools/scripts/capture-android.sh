#!/bin/zsh
# Records the two Android takes for one locale into public/cap (and-<lang>-connect.mp4, and-<lang>-new.mp4, 30 fps)
# plus the list still. Usage: scripts/capture-android.sh es-ES es   (or en-US en)
# Needs a 1080x2400 / 420 dpi emulator (Medium Phone or Pixel 8 profiles) with the debug build installed, dark mode
# (adb shell cmd uimode night yes) and the clean status bar from store/android/tools/capture-screenshots.sh with the
# clock at 0941. Taps find their target by text with uiautomator, so they don't depend on the device's insets.
# Wipes the app's data (pm clear). The frame numbers in src/footage.ts belong to the recordings in public/cap:
# re-check them after recording again.
set -e
ADB=${ADB:-adb}; P=com.antonioleiva.remotesessions
L=$1; T=$2
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/cap"; mkdir -p $OUT
typeset -A es=(try "Probar sin ordenador" row "Arreglar el inicio de sesión con Google" connect "Conectar" new "Nueva conversación"
  other "Elegir otra carpeta" start "Empezar aquí")
typeset -A en=(try "Try without a computer" row "Fix Google sign-in" connect "Connect" new "New conversation"
  other "Choose another folder" start "Start here")
label() { [[ $T == es ]] && echo ${es[$1]} || echo ${en[$1]}; }

# Taps the centre of the first element whose text or content description is $1.
tap() {
  $ADB shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  local xy=$($ADB exec-out cat /sdcard/ui.xml | python3 -c '
import re, sys
label = sys.argv[1]
for node in re.findall(r"<node [^>]*>", sys.stdin.read()):
    if f"text=\"{label}\"" in node or f"content-desc=\"{label}\"" in node:
        x1, y1, x2, y2 = map(int, re.search(r"bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"", node).groups())
        print((x1 + x2) // 2, (y1 + y2) // 2)
        break
' "$1")
  [[ -n $xy ]] || { echo "not found: $1" >&2; exit 1; }
  $ADB shell input tap ${=xy}
}
fresh() {
  $ADB shell pm clear $P >/dev/null
  $ADB shell cmd locale set-app-locales $P --locales $L
  $ADB shell am start -n $P/.MainActivity --ez video true >/dev/null; sleep 3   # debug-only demo for the video
  tap "$(label try)"; sleep 3
}
rec() { $ADB shell screenrecord --bit-rate 20000000 /sdcard/take.mp4 & sleep 1.5; }
stop() {
  $ADB shell pkill -INT screenrecord; sleep 2
  $ADB pull /sdcard/take.mp4 $OUT/raw.mp4 >/dev/null; $ADB shell rm /sdcard/take.mp4
  ffmpeg -hide_banner -loglevel error -y -i $OUT/raw.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -an $OUT/and-$T-$1.mp4
  rm $OUT/raw.mp4
}
fresh; rec
sleep 1; tap "$(label row)"
sleep 2; tap "$(label connect)"
sleep 3; stop connect
ffmpeg -hide_banner -loglevel error -y -i $OUT/and-$T-connect.mp4 -vf "select=eq(n\,45)" -frames:v 1 $OUT/and-$T-list.png
fresh; rec
sleep 1; tap "$(label new)"
sleep 1.5; tap "$(label other)"
sleep 1.5; tap "Projects"
sleep 1.5; tap "landing-page"
sleep 1.5; tap "$(label start)"
sleep 3; stop new
