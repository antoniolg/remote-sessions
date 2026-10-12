#!/bin/zsh
# Records the two Android takes for one locale into public/cap (and-<lang>-connect.mp4, and-<lang>-new.mp4, 30 fps)
# plus the list still. Usage: scripts/capture-android.sh es-ES es
# Needs the Medium_Phone_API_36.1 emulator (1080x2400, 420 dpi) with the debug build installed, dark mode
# (adb shell cmd uimode night yes) and the clean status bar from store/android/tools/capture-screenshots.sh, with the
# clock at 0941. Taps use fixed coordinates for that layout. Wipes the app's data (pm clear).
# The frame numbers in src/footage.ts belong to the recordings in public/cap: re-check them after recording again.
set -e
ADB=${ADB:-adb}; P=com.antonioleiva.remotesessions
L=$1; T=$2
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/cap"; mkdir -p $OUT
fresh() {
  $ADB shell pm clear $P >/dev/null
  $ADB shell cmd locale set-app-locales $P --locales $L
  $ADB shell am start -n $P/.MainActivity --ez video true >/dev/null; sleep 3   # debug-only demo for the video
  $ADB shell input tap 540 2180; sleep 3                                         # Try without a computer
}
rec() { $ADB shell screenrecord --bit-rate 20000000 /sdcard/take.mp4 & sleep 1.5; }
stop() {
  $ADB shell pkill -INT screenrecord; sleep 2
  $ADB pull /sdcard/take.mp4 $OUT/raw.mp4 >/dev/null; $ADB shell rm /sdcard/take.mp4
  ffmpeg -hide_banner -loglevel error -y -i $OUT/raw.mp4 -vf fps=30 -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -an $OUT/and-$T-$1.mp4
  rm $OUT/raw.mp4
}
fresh; rec
sleep 1.5; $ADB shell input tap 360 552        # first conversation
sleep 3;   $ADB shell input tap 540 2232       # Connect
sleep 3.5; stop connect
ffmpeg -hide_banner -loglevel error -y -i $OUT/and-$T-connect.mp4 -vf "select=eq(n\,45)" -frames:v 1 $OUT/and-$T-list.png
fresh; rec
sleep 1.5; $ADB shell input tap 754 148        # +
sleep 2.2; $ADB shell input tap 330 1716       # Choose another folder
sleep 2;   $ADB shell input tap 330 829        # Projects
sleep 2;   $ADB shell input tap 330 682        # landing-page
sleep 2;   $ADB shell input tap 540 2226       # Start here
sleep 3.5; stop new
