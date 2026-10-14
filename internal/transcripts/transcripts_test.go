package transcripts

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func lines(t *testing.T, records ...any) []byte {
	t.Helper()
	var out []string
	for _, record := range records {
		data, err := json.Marshal(record)
		if err != nil {
			t.Fatal(err)
		}
		out = append(out, string(data))
	}
	return []byte(strings.Join(out, "\n"))
}

type m = map[string]any

func TestBridgeURL(t *testing.T) {
	if got := BridgeURL("cse_01ABC"); got != "https://claude.ai/code/session_01ABC" {
		t.Fatalf("got %q", got)
	}
	if BridgeURL("") != "" {
		t.Fatal("empty bridge should have no URL")
	}
}

func TestSummarizeKeepsLatestTitleAndBridgeAndFirstTypedPrompt(t *testing.T) {
	data := lines(t,
		m{"type": "user", "cwd": "/repo", "message": m{"content": "<command-name>/clear</command-name>"}},
		m{"type": "user", "cwd": "/repo", "message": m{"content": []m{{"type": "text", "text": "Arregla el login"}}}},
		m{"type": "assistant", "message": m{"content": []m{}}},
		m{"type": "custom-title", "customTitle": "Viejo"},
		m{"type": "custom-title", "customTitle": "Login roto"},
		m{"type": "bridge-session", "bridgeSessionId": "cse_1"},
		m{"type": "bridge-session", "bridgeSessionId": "cse_2"},
	)
	data = append(data, []byte("\n{\"type\":\"user\",\"tru")...)
	s := Summarize("id", data)
	if s.Cwd != "/repo" || s.FirstPrompt != "Arregla el login" || s.CustomTitle != "Login roto" || s.BridgeSessionID != "cse_2" || s.Messages != 2 {
		t.Fatalf("unexpected summary %+v", s)
	}
	if s.Title() != "Login roto" || s.Project() != "repo" {
		t.Fatalf("title %q project %q", s.Title(), s.Project())
	}
}

func TestStoreListSkipsEmptyTranscripts(t *testing.T) {
	dir := t.TempDir()
	project := filepath.Join(dir, "-repo")
	os.MkdirAll(project, 0o755)
	id := "11111111-2222-3333-4444-555555555555"
	os.WriteFile(filepath.Join(project, id+".jsonl"), lines(t, m{"type": "user", "cwd": "/repo", "message": m{"content": "hola"}}), 0o644)
	os.WriteFile(filepath.Join(project, "empty.jsonl"), lines(t, m{"type": "file-history-snapshot"}), 0o644)
	store := NewStore(dir)
	list, err := store.List()
	if err != nil || len(list) != 1 || list[0].Title() != "hola" {
		t.Fatalf("list %+v err %v", list, err)
	}
	if path, ok := store.Find(id); !ok || filepath.Base(path) != id+".jsonl" {
		t.Fatalf("find %q %v", path, ok)
	}
	if _, ok := store.Find("../etc/passwd"); ok {
		t.Fatal("invalid ids must not resolve")
	}
}

func TestParseMessagesMergesAssistantRecords(t *testing.T) {
	data := lines(t,
		m{"type": "user", "uuid": "u1", "message": m{"content": "Arregla el login"}},
		m{"type": "assistant", "uuid": "a1", "message": m{"content": []m{{"type": "text", "text": "Miro el código."}}}},
		m{"type": "assistant", "uuid": "a2", "message": m{"content": []m{{"type": "tool_use", "name": "Read"}}}},
		m{"type": "user", "uuid": "t1", "message": m{"content": []m{{"type": "tool_result", "content": "..."}}}},
		m{"type": "assistant", "uuid": "a3", "message": m{"content": []m{{"type": "text", "text": "Hecho."}}}},
		m{"type": "assistant", "uuid": "s1", "isSidechain": true, "message": m{"content": []m{{"type": "text", "text": "subagente"}}}},
	)
	got := ParseMessages(data, 40)
	want := []struct {
		role, text string
		tools      []string
	}{{"user", "Arregla el login", []string{}}, {"assistant", "Miro el código.\n\nHecho.", []string{"Read"}}}
	if len(got) != len(want) {
		t.Fatalf("got %+v", got)
	}
	for i := range want {
		if got[i].Role != want[i].role || got[i].Text != want[i].text || !reflect.DeepEqual(got[i].Tools, want[i].tools) {
			t.Fatalf("message %d: %+v", i, got[i])
		}
	}
}

func TestParseMessagesReturnsLatest(t *testing.T) {
	var records []any
	for _, text := range []string{"m0", "m1", "m2", "m3", "m4"} {
		records = append(records, m{"type": "user", "uuid": text, "message": m{"content": text}})
	}
	got := ParseMessages(lines(t, records...), 2)
	if len(got) != 2 || got[0].Text != "m3" || got[1].Text != "m4" {
		t.Fatalf("got %+v", got)
	}
}

func TestProjectDir(t *testing.T) {
	s := NewStore("/home/me/.claude/projects")
	if got, want := s.ProjectDir("/Users/me/my.app_v2"), "/home/me/.claude/projects/-Users-me-my-app-v2"; got != want {
		t.Fatalf("ProjectDir = %s, want %s", got, want)
	}
}

func TestBridgeAfterIsTheLatestTimestampBeforeTheBridge(t *testing.T) {
	data := []byte(`{"type":"user","uuid":"u1","timestamp":"2026-10-11T10:00:00.000Z","message":{"content":"Hola"}}
{"type":"assistant","uuid":"a1","timestamp":"2026-10-11T10:05:00.000Z","message":{"content":[{"type":"text","text":"Buenas"}]}}
{"type":"bridge-session","bridgeSessionId":"cse_abc"}
{"type":"user","uuid":"u2","timestamp":"2026-10-11T11:00:00.000Z","message":{"content":"Otra"}}
`)
	s := Summarize("id", data)
	want := time.Date(2026, 10, 11, 10, 5, 0, 0, time.UTC)
	if s.BridgeSessionID != "cse_abc" || !s.BridgeAfter.Equal(want) {
		t.Fatalf("bridge %q after %v, want cse_abc after %v", s.BridgeSessionID, s.BridgeAfter, want)
	}
}

func TestRemoteControlNotices(t *testing.T) {
	on := `{"type":"system","subtype":"bridge_status","content":"/remote-control is active · Continue here, on your phone, or at https://claude.ai/code/session_A","url":"https://claude.ai/code/session_A","timestamp":"2026-10-14T06:00:00.000Z"}` + "\n"
	off := `{"type":"system","subtype":"informational","content":"Remote Control disconnected — this session was ended or archived from another device or app (code 4090)","timestamp":"2026-10-14T07:15:10.920Z"}` + "\n"
	// Rewritten after the disconnect too, so it must not count as "on".
	bridge := `{"type":"bridge-session","bridgeSessionId":"cse_A","lastSequenceNum":111}` + "\n"
	started := time.Date(2026, 10, 14, 5, 0, 0, 0, time.UTC)

	dropped := Summarize("id", []byte(on+off+bridge))
	if dropped.RemoteActiveSince(started) || !dropped.RemoteDroppedSince(started) {
		t.Fatalf("after a disconnect: active=%v dropped=%v", dropped.RemoteActiveSince(started), dropped.RemoteDroppedSince(started))
	}

	again := `{"type":"system","subtype":"bridge_status","content":"/remote-control is active · …","url":"https://claude.ai/code/session_B","timestamp":"2026-10-14T08:00:00.000Z"}` + "\n"
	back := Summarize("id", []byte(on+off+bridge+again))
	if !back.RemoteActiveSince(started) || back.RemoteDroppedSince(started) || back.RemoteURL != "https://claude.ai/code/session_B" {
		t.Fatalf("turned on again: active=%v dropped=%v url=%s", back.RemoteActiveSince(started), back.RemoteDroppedSince(started), back.RemoteURL)
	}
	// Turned on in an earlier run of the process.
	if back.RemoteActiveSince(time.Date(2026, 10, 14, 9, 0, 0, 0, time.UTC)) {
		t.Fatal("a notice from before the process started counted as active")
	}
}
