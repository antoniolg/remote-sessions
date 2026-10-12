package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/antoniolg/remote-sessions/internal/claude"
	"github.com/antoniolg/remote-sessions/internal/launcher"
	"github.com/antoniolg/remote-sessions/internal/transcripts"
)

const sessionID = "11111111-2222-3333-4444-555555555555"

func testServer(t *testing.T) http.Handler {
	t.Helper()
	dir := t.TempDir()
	project := filepath.Join(dir, "-repo")
	os.MkdirAll(project, 0o755)
	os.WriteFile(filepath.Join(project, sessionID+".jsonl"), []byte(
		`{"type":"user","uuid":"u1","cwd":"/repo","message":{"content":"Hola"}}`+"\n"+
			`{"type":"assistant","uuid":"a1","message":{"content":[{"type":"text","text":"Buenas"}]}}`+"\n"), 0o644)
	// `false` exits without output: no session reported as open.
	s := &Server{ID: "id", Name: "test", Version: "test", Token: "secret", Store: transcripts.NewStore(dir),
		Agents: &claude.Agents{Bin: "false"}, Launcher: launcher.New("false")}
	return s.Handler()
}

func do(t *testing.T, h http.Handler, method, path, token string) (*httptest.ResponseRecorder, map[string]any) {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	return rec, body
}

func TestHealthNeedsNoToken(t *testing.T) {
	rec, body := do(t, testServer(t), "GET", "/health", "")
	if rec.Code != 200 || body["id"] != "id" {
		t.Fatalf("%d %v", rec.Code, body)
	}
}

func TestRejectsWrongToken(t *testing.T) {
	h := testServer(t)
	for _, token := range []string{"", "nope"} {
		if rec, _ := do(t, h, "GET", "/v1/sessions", token); rec.Code != 401 {
			t.Fatalf("token %q: %d", token, rec.Code)
		}
	}
}

func TestListsSessionsAndMessages(t *testing.T) {
	h := testServer(t)
	rec, body := do(t, h, "GET", "/v1/sessions", "secret")
	sessions, _ := body["sessions"].([]any)
	if rec.Code != 200 || len(sessions) != 1 {
		t.Fatalf("%d %v", rec.Code, body)
	}
	first := sessions[0].(map[string]any)
	if first["title"] != "Hola" || first["project"] != "repo" || first["running"] != nil || first["remote"] != nil {
		t.Fatalf("unexpected session %v", first)
	}
	rec, body = do(t, h, "GET", "/v1/sessions/"+sessionID+"/messages?limit=1", "secret")
	messages, _ := body["messages"].([]any)
	if rec.Code != 200 || len(messages) != 1 || messages[0].(map[string]any)["text"] != "Buenas" {
		t.Fatalf("%d %v", rec.Code, body)
	}
}

func TestUnknownSessionIs404(t *testing.T) {
	h := testServer(t)
	for _, path := range []string{"/v1/sessions/not-a-uuid/messages", "/v1/sessions/99999999-2222-3333-4444-555555555555/messages"} {
		if rec, _ := do(t, h, "GET", path, "secret"); rec.Code != 404 {
			t.Fatalf("%s: %d", path, rec.Code)
		}
	}
	if rec, body := do(t, h, "DELETE", "/v1/sessions/"+sessionID+"/remote-control", "secret"); rec.Code != 404 || body["code"] != "not_found" {
		t.Fatalf("delete: %d %v", rec.Code, body)
	}
}

func TestServesWebClientWithoutToken(t *testing.T) {
	h := testServer(t)
	for _, path := range []string{"/app/", "/app/app.js", "/app/manifest.webmanifest", "/app/sw.js"} {
		rec, _ := do(t, h, "GET", path, "")
		if rec.Code != 200 || rec.Header().Get("Content-Security-Policy") == "" {
			t.Fatalf("%s: %d, CSP %q", path, rec.Code, rec.Header().Get("Content-Security-Policy"))
		}
	}
	if rec, _ := do(t, h, "GET", "/", ""); rec.Code != http.StatusFound || rec.Header().Get("Location") != "/app/" {
		t.Fatalf("root: %d %s", rec.Code, rec.Header().Get("Location"))
	}
	if rec, _ := do(t, h, "GET", "/nope", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("unknown path: %d", rec.Code)
	}
}
