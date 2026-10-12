#!/bin/zsh
# Cuts the soundtrack edits from public/audio/music-source.mp3 (Lyria 3.5, Gemini API, 123 BPM, 62.7 s).
# The source's beat grid: drop on the downbeat at 9.8386 s, bars every 1.9508 s, final hit at 54.707 s.
# Each edit keeps the intro build and the first phrase after the drop, then jumps (30 ms crossfade on a downbeat)
# to the last 4 bars before the final hit, so the hit lands on "sin cuentas" / "no accounts".
#   music.wav           launch videos (30 s): drop at 5.00 s, jump at 20.61 s, hit at 28.41 s
#   music-appstore.wav  App Store preview (24 s): drop at 1.95 s, jump at 13.66 s, hit at 21.46 s
set -e
cd "$(dirname "$0")/../public/audio"
edit() { # edit <out> <start> <jump-end> <total> <fade-in> <fade-out-start> <fade-out>
  ffmpeg -hide_banner -loglevel error -y -i music-source.mp3 -filter_complex "
    [0:a]aresample=48000,atrim=start=$2:end=$3,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=$5[a];
    [0:a]aresample=48000,atrim=start=46.889:end=57.40,asetpts=PTS-STARTPTS[b];
    [a][b]acrossfade=d=0.03:c1=qsin:c2=qsin,atrim=end=$4,afade=t=out:st=$6:d=$7:curve=exp[out]" \
    -map "[out]" -c:a pcm_s16le $1
}
edit music.wav 4.8386 25.4614 30.0 0.35 28.9 1.1
edit music-appstore.wav 7.8878 21.5584 24.0 0.2 22.4 1.6
