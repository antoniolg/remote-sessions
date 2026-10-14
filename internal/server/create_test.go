package server

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/antoniolg/remote-sessions/internal/claude"
	"github.com/antoniolg/remote-sessions/internal/launcher"
	"github.com/antoniolg/remote-sessions/internal/transcripts"
)

// homeServer serves a temporary home with a "projects/web" folder, running claudeBin.
func homeServer(t *testing.T, claudeBin string) (*Server, string) {
	t.Helper()
	home := t.TempDir()
	if err := os.MkdirAll(filepath.Join(home, "projects", "web"), 0o755); err != nil {
		t.Fatal(err)
	}
	l := launcher.New(claudeBin)
	l.Timeout = 5 * time.Second
	return &Server{ID: "id", Name: "test", Version: "test", Token: "secret", Store: transcripts.NewStore(t.TempDir()),
		Agents: &claude.Agents{Bin: "false"}, Launcher: l, Home: home}, home
}

func post(t *testing.T, s *Server, path string, body any) (int, map[string]any) {
	t.Helper()
	data, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", path, bytes.NewReader(data))
	req.Header.Set("Authorization", "Bearer secret")
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	var out map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec.Code, out
}

func TestListsFoldersInsideHome(t *testing.T) {
	s, home := homeServer(t, "false")
	rec, body := do(t, s.Handler(), "GET", "/v1/folders?path=~/projects", "secret")
	folders, _ := body["folders"].([]any)
	if rec.Code != 200 || body["parent"] != home || len(folders) != 1 || folders[0].(map[string]any)["name"] != "web" {
		t.Fatalf("%d %v", rec.Code, body)
	}
	if rec, body := do(t, s.Handler(), "GET", "/v1/folders?path=/", "secret"); rec.Code != 400 || body["code"] != "outside_home" {
		t.Fatalf("outside home: %d %v", rec.Code, body)
	}
}

func TestCreateRejectsFoldersOutsideHome(t *testing.T) {
	s, _ := homeServer(t, "false")
	if code, body := post(t, s, "/v1/sessions", map[string]any{"cwd": os.TempDir()}); code != 400 || body["code"] != "outside_home" {
		t.Fatalf("%d %v", code, body)
	}
	if code, body := post(t, s, "/v1/sessions", map[string]any{"cwd": "~/missing"}); code != 404 || body["code"] != "not_found" {
		t.Fatalf("%d %v", code, body)
	}
}

func TestCreateStartsANewSessionWithRemoteControl(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("uses a shell script as claude")
	}
	argsFile := filepath.Join(t.TempDir(), "args")
	// A fake claude that records its arguments and publishes a Remote Control URL.
	script := filepath.Join(t.TempDir(), "claude")
	os.WriteFile(script, []byte("#!/bin/sh\necho \"$@\" > "+argsFile+"\necho https://claude.ai/code/session_abc123\nsleep 30\n"), 0o755)
	s, home := homeServer(t, script)
	defer s.Launcher.StopAll()

	code, body := post(t, s, "/v1/sessions", map[string]any{"cwd": "~/projects/web", "title": "  New   feature "})
	if code != 201 || body["url"] != "https://claude.ai/code/session_abc123" || body["cwd"] != filepath.Join(home, "projects", "web") {
		t.Fatalf("%d %v", code, body)
	}
	id, _ := body["id"].(string)
	if !transcripts.SessionIDPattern.MatchString(id) {
		t.Fatalf("id %q is not a UUID", id)
	}
	args, _ := os.ReadFile(argsFile)
	if got, want := strings.TrimSpace(string(args)), "--session-id "+id+" --remote-control New feature"; got != want {
		t.Fatalf("claude args = %q, want %q", got, want)
	}
	if m, ok := s.Launcher.Get(id); !ok || m.URL == "" {
		t.Fatal("the new session is not managed")
	}
}

func TestOpenRemoteURLIgnoresDroppedRemoteControl(t *testing.T) {
	agent := claude.Agent{StartedAt: time.Date(2026, 10, 14, 5, 0, 0, 0, time.UTC).UnixMilli()}
	on := time.Date(2026, 10, 14, 6, 0, 0, 0, time.UTC)
	active := transcripts.Summary{BridgeSessionID: "cse_A", RemoteOnAt: on, RemoteURL: "https://claude.ai/code/session_A"}
	if got := openRemoteURL(active, agent); got != "https://claude.ai/code/session_A" {
		t.Fatalf("active: %q", got)
	}
	dropped := active
	dropped.RemoteOffAt = on.Add(time.Hour)
	if got := openRemoteURL(dropped, agent); got != "" {
		t.Fatalf("dropped: %q, want no URL", got)
	}
}

func TestConnectForksASessionOpenElsewhere(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("uses a shell script as claude")
	}
	argsFile := filepath.Join(t.TempDir(), "args")
	// A fake claude: `agents` reports sessionID as open; anything else records its arguments and
	// publishes a Remote Control URL.
	script := filepath.Join(t.TempDir(), "claude")
	os.WriteFile(script, []byte(`#!/bin/sh
if [ "$1" = "agents" ]; then echo '[{"sessionId":"`+sessionID+`","kind":"interactive","status":"idle","startedAt":1}]'; exit 0; fi
echo "$@" > `+argsFile+`
echo https://claude.ai/code/session_fork1
sleep 30
`), 0o755)
	dir := t.TempDir()
	project := filepath.Join(dir, "-repo")
	os.MkdirAll(project, 0o755)
	os.WriteFile(filepath.Join(project, sessionID+".jsonl"), []byte(`{"type":"user","uuid":"u1","cwd":"`+dir+`","message":{"content":"Hola"}}`+"\n"), 0o644)
	l := launcher.New(script)
	l.Timeout = 5 * time.Second
	s := &Server{ID: "id", Name: "test", Version: "test", Token: "secret", Store: transcripts.NewStore(dir),
		Agents: &claude.Agents{Bin: script}, Launcher: l, Home: dir}
	defer s.Launcher.StopAll()

	if code, body := post(t, s, "/v1/sessions/"+sessionID+"/remote-control", map[string]any{}); code != 409 || body["code"] != "open_elsewhere" {
		t.Fatalf("without fork: %d %v", code, body)
	}
	code, body := post(t, s, "/v1/sessions/"+sessionID+"/remote-control", map[string]any{"fork": true})
	copyID, _ := body["id"].(string)
	if code != 200 || body["url"] != "https://claude.ai/code/session_fork1" || !transcripts.SessionIDPattern.MatchString(copyID) || copyID == sessionID {
		t.Fatalf("fork: %d %v", code, body)
	}
	args, _ := os.ReadFile(argsFile)
	want := "--resume " + sessionID + " --fork-session --session-id " + copyID + " --remote-control Hola"
	if got := strings.TrimSpace(string(args)); got != want {
		t.Fatalf("claude args = %q, want %q", got, want)
	}
}
