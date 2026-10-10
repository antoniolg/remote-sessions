package launcher

import "testing"

func TestDetectPrompt(t *testing.T) {
	cases := map[string]prompt{
		"Accessing workspace: Is\x1b[25Gthis a project you trust? ❯ No, exit  Yes, I trust this folder  Enter to confirm":                trustPrompt,
		"Turn browser tools off ... ❯ No, keep browser tools off  Yes, use my browser  Enter to confirm · Esc to keep browser tools off": browserPrompt,
		"Something else? ❯ Yes  No  Enter to confirm": unknownPrompt,
		"❯ responde solo: hola ⏺ hola":                noPrompt,
	}
	for screen, want := range cases {
		if got := detectPrompt(screen); got != want {
			t.Errorf("%q: got %d want %d", screen, got, want)
		}
	}
}

func TestRemoteURL(t *testing.T) {
	screen := "/remote-control is active · Continue here, on your phone, or at https://claude.ai/code/session_019PVwJawcc7oqRxr1abfxcC\r"
	if got := remoteURL.FindString(screen); got != "https://claude.ai/code/session_019PVwJawcc7oqRxr1abfxcC" {
		t.Fatalf("got %q", got)
	}
}

func TestRingSince(t *testing.T) {
	r := newRing(8)
	r.Write([]byte("abcdef"))
	_, offset := r.Since(0)
	r.Write([]byte("ghij"))
	text, _ := r.Since(offset)
	if text != "ghij" {
		t.Fatalf("got %q", text)
	}
}
