"""Voice-over lines of the launch video with Gemini TTS (Interactions API), normalised to −16 LUFS.

Run from store/video/tools: ~/.local/bin/oprun python3 scripts/voiceover.py [es|en] [line numbers…]
Writes public/audio/vo-<lang>-<n>.wav. Needs GEMINI_API_KEY (1Password "Agent Runtime", through oprun).
Each take comes out slightly different: listen before replacing a line that is already in the edit, and update the
speech lengths in src/timeline.json if the timing changes.
"""
import base64, json, os, subprocess, sys, time, urllib.error, urllib.request

MODEL = "gemini-3.8-flash-tts"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio")
KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
# Extended Voice Library: Castilian Spanish commercial voice and a US commercial voice.
VOICES = {"es": "es-es-commercial-7", "en": "en-us-nika"}
STYLE = "energetic product launch voice-over, confident and upbeat, brisk pace"
LINES = {
    "es": [
        "Claude Code está a mitad de una tarea… y tú te tienes que ir.",
        "Abre Remote Sessions: todas tus conversaciones, en el móvil.",
        "Mira en qué punto está y toca Conectar…",
        "…y sigue en la app de Claude.",
        "¿Algo nuevo? Empieza una conversación en cualquier carpeta del ordenador.",
        "Remote Sessions. Gratis, open source y sin cuentas.",
    ],
    "en": [
        "Claude Code is halfway through a task… and you have to go.",
        "Open Remote Sessions: all your conversations, on your phone.",
        "See where it's at, and tap Connect…",
        "…and keep going in the Claude app.",
        "Something new? Start a conversation in any folder on your computer.",
        "Remote Sessions. Free, open source, and no accounts.",
    ],
}


def speak(text, voice):
    body = {
        "model": MODEL,
        "input": [{"type": "user_input", "content": [{
            "type": "text", "text": text, "annotations": [{"type": "speech_metadata", "style": STYLE}],
        }]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": voice}]},
    }
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    for attempt in range(6):
        try:
            data = json.loads(urllib.request.urlopen(req, timeout=180).read())
            for step in data.get("steps", []):
                for item in step.get("content", []) or []:
                    if item.get("type") == "audio":
                        return base64.b64decode(item["data"])
            raise SystemExit("no audio in the response")
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 5:
                time.sleep(15 * (attempt + 1))
                continue
            raise SystemExit(f"HTTP {e.code}: {e.read().decode()[:300]}")


def main():
    langs = [a for a in sys.argv[1:] if a in LINES] or list(LINES)
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}
    for lang in langs:
        for n, text in enumerate(LINES[lang], 1):
            if only and n not in only:
                continue
            raw = os.path.join(OUT, f"vo-{lang}-{n}.raw.wav")
            open(raw, "wb").write(speak(text, VOICES[lang]))  # 24 kHz mono WAV
            out = os.path.join(OUT, f"vo-{lang}-{n}.wav")
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af",
                            "highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000", "-ac", "1", out], check=True)
            os.remove(raw)
            print(out)


main()
