package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
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

// A browser client served by another paired computer calls this API cross-origin with its own token.
func TestAllowsCrossOriginAPICalls(t *testing.T) {
	h := testServer(t)
	req := httptest.NewRequest("OPTIONS", "/v1/sessions", nil)
	req.Header.Set("Origin", "https://10.0.0.2:8787")
	req.Header.Set("Access-Control-Request-Method", "GET")
	req.Header.Set("Access-Control-Request-Headers", "authorization")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("preflight: %d", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("preflight origin: %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(got, "Authorization") {
		t.Fatalf("preflight headers: %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); !strings.Contains(got, "DELETE") {
		t.Fatalf("preflight methods: %q", got)
	}

	// The key is still required: CORS only lets the browser read the answer.
	req = httptest.NewRequest("GET", "/v1/sessions", nil)
	req.Header.Set("Origin", "https://10.0.0.2:8787")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized || rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("no token: %d %q", rec.Code, rec.Header().Get("Access-Control-Allow-Origin"))
	}
	req.Header.Set("Authorization", "Bearer secret")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("with token: %d %q", rec.Code, rec.Header().Get("Access-Control-Allow-Origin"))
	}

	// Other websites cannot read who this computer is: /health is shared cross-origin only with the key.
	req = httptest.NewRequest("GET", "/health", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("/health without key: %d %q", rec.Code, rec.Header().Get("Access-Control-Allow-Origin"))
	}
	req.Header.Set("Authorization", "Bearer wrong")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("/health with a wrong key: %q", rec.Header().Get("Access-Control-Allow-Origin"))
	}
	req.Header.Set("Authorization", "Bearer secret")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("/health with the key: %q", rec.Header().Get("Access-Control-Allow-Origin"))
	}

	// The web client's files stay same-origin.
	req = httptest.NewRequest("GET", "/app/", nil)
	req.Header.Set("Origin", "https://10.0.0.2:8787")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("/app/ origin: %q", got)
	}
}
