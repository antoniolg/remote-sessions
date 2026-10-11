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
