#!/bin/zsh
# Captures the Play screenshots for one locale from a running 1080x2400 emulator (Medium Phone, API 36)
# with the debug build installed. Usage: store/android/tools/capture-screenshots.sh en-US
# Taps use fixed coordinates for that 1080x2400 / 420 dpi layout. Wipes the app's data (pm clear).
# Before running, enable the clean status bar:
#   adb shell settings put global sysui_demo_allowed 1
#   adb shell am broadcast -a com.android.systemui.demo -e command enter
#   adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1200
#   adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
#   adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 -e fully true
#   adb shell am broadcast -a com.android.systemui.demo -e command network -e mobile hide
#   adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# Afterwards strip alpha (Play wants 24-bit PNG):
#   uv run --with pillow python -c "import glob; from PIL import Image; [Image.open(f).convert('RGB').save(f) for f in glob.glob('store/android/screenshots/*/*.png')]"
set -e
L=$1; P=com.antonioleiva.remotesessions
OUT="$(cd "$(dirname "$0")/.." && pwd)/screenshots/$L"
mkdir -p "$OUT"
shot() { adb exec-out screencap -p > $OUT/$1; }
adb shell cmd uimode night yes >/dev/null
adb shell pm clear $P >/dev/null
adb shell cmd locale set-app-locales $P --locales $L
adb shell am start -n $P/.MainActivity >/dev/null; sleep 3
shot 04-welcome.png
adb shell input tap 540 2036; sleep 2          # Get started
shot 03-install.png                             # macOS is selected by default
adb shell input keyevent BACK; sleep 1
adb shell input tap 540 2180; sleep 3          # Try without a computer
shot 01-list.png
adb shell input tap 300 483; sleep 3           # first conversation
shot 02-detail.png
adb shell input keyevent BACK; sleep 1
adb shell input tap 1006 147; sleep 2          # Settings
shot 05-settings.png
