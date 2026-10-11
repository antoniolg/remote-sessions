// Package transcripts reads Claude Code transcripts (~/.claude/projects/*/*.jsonl).
package transcripts

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	titleMax      = 120
	fullReadLimit = 2 << 20
	headBytes     = 256 << 10
	tailBytes     = 1 << 20
)

// Summary is what the session list needs from one transcript.
type Summary struct {
	ID              string
	Cwd             string
	CustomTitle     string
	AITitle         string
	FirstPrompt     string
	LastPrompt      string
	BridgeSessionID string
	// BridgeAfter is the latest timestamp written before the bridge record, which has none of its own:
	// it tells whether Remote Control was turned on in the current run of an open session.
	BridgeAfter time.Time
	Messages    int
	UpdatedAt   time.Time
}

// Title picks the best available title.
func (s Summary) Title() string {
	for _, candidate := range []string{s.CustomTitle, s.AITitle, s.FirstPrompt, s.LastPrompt} {
		if candidate != "" {
			return Clip(candidate, titleMax)
		}
	}
	return "" // the apps show a translated "Untitled"
}

// Project is the last path component of the working directory.
func (s Summary) Project() string {
	if s.Cwd == "" {
		return ""
	}
	return filepath.Base(filepath.FromSlash(strings.ReplaceAll(s.Cwd, "\\", "/")))
}

// Clip collapses whitespace and cuts text to max runes with an ellipsis.
func Clip(text string, max int) string {
	oneLine := strings.Join(strings.Fields(text), " ")
	if utf8.RuneCountInString(oneLine) <= max {
		return oneLine
	}
	runes := []rune(oneLine)
	return string(runes[:max-1]) + "…"
}

type record struct {
	Type            string         `json:"type"`
	UUID            string         `json:"uuid"`
	SessionID       string         `json:"sessionId"`
	Cwd             string         `json:"cwd"`
	Timestamp       string         `json:"timestamp"`
	IsMeta          bool           `json:"isMeta"`
	IsSidechain     bool           `json:"isSidechain"`
	CustomTitle     string         `json:"customTitle"`
	AITitle         string         `json:"aiTitle"`
	SummaryText     string         `json:"summary"`
	LastPrompt      string         `json:"lastPrompt"`
	BridgeSessionID string         `json:"bridgeSessionId"`
	Message         *recordMessage `json:"message"`
}

type recordMessage struct {
	Content json.RawMessage `json:"content"`
}

type contentPart struct {
	Type string `json:"type"`
	Text string `json:"text"`
	Name string `json:"name"`
}

func (m *recordMessage) parts() []contentPart {
	if m == nil || len(m.Content) == 0 {
		return nil
	}
	var text string
	if json.Unmarshal(m.Content, &text) == nil {
		return []contentPart{{Type: "text", Text: text}}
	}
	var parts []contentPart
	_ = json.Unmarshal(m.Content, &parts)
	return parts
}

// typedText returns what the user actually typed, skipping slash commands, hook output and tool results.
func typedText(r record) string {
	if r.IsMeta || r.IsSidechain {
		return ""
	}
	var texts []string
	for _, part := range r.Message.parts() {
		if part.Type == "text" {
			texts = append(texts, part.Text)
		}
	}
	text := strings.TrimSpace(strings.Join(texts, "\n"))
	if text == "" || strings.HasPrefix(text, "<") || strings.HasPrefix(text, "Caveat:") {
		return ""
	}
	return text
}

// eachRecord calls fn for every parseable JSONL line; broken lines (cut edges, partial writes) are skipped.
func eachRecord(data []byte, fn func(record)) {
	scanner := bufio.NewScanner(bytes.NewReader(data))
	scanner.Buffer(make([]byte, 0, 64<<10), 64<<20)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var r record
		if json.Unmarshal(line, &r) == nil {
			fn(r)
		}
	}
}

// Summarize parses transcript data. Exported for tests.
func Summarize(id string, data []byte) Summary {
	s := Summary{ID: id}
	var latest time.Time
	eachRecord(data, func(r record) {
		if at, err := time.Parse(time.RFC3339Nano, r.Timestamp); err == nil && at.After(latest) {
			latest = at
		}
		if s.Cwd == "" && r.Cwd != "" {
			s.Cwd = r.Cwd
		}
		switch r.Type {
		case "custom-title":
			if r.CustomTitle != "" {
				s.CustomTitle = r.CustomTitle
			}
		case "ai-title":
			if r.AITitle != "" {
				s.AITitle = r.AITitle
			}
		case "summary":
			if r.SummaryText != "" && s.AITitle == "" {
				s.AITitle = r.SummaryText
			}
		case "last-prompt":
			if r.LastPrompt != "" {
				s.LastPrompt = r.LastPrompt
			}
		case "bridge-session":
			if r.BridgeSessionID != "" {
				s.BridgeSessionID = r.BridgeSessionID
				s.BridgeAfter = latest
			}
		case "user":
			if typed := typedText(r); typed != "" {
				s.Messages++
				if s.FirstPrompt == "" {
					s.FirstPrompt = typed
				}
			}
		case "assistant":
			if !r.IsSidechain {
				s.Messages++
			}
		}
	})
	return s
}

// readHeadTail reads small files whole; big ones only need their start (cwd, first prompt)
// and end (latest title and bridge).
func readHeadTail(path string, size int64) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	if size <= fullReadLimit {
		return io.ReadAll(file)
	}
	head := make([]byte, headBytes)
	if _, err := file.ReadAt(head, 0); err != nil && err != io.EOF {
		return nil, err
	}
	tail := make([]byte, tailBytes)
	if _, err := file.ReadAt(tail, size-tailBytes); err != nil && err != io.EOF {
		return nil, err
	}
	// Drop the cut lines at both edges.
	if i := bytes.LastIndexByte(head, '\n'); i >= 0 {
		head = head[:i+1]
	}
	if i := bytes.IndexByte(tail, '\n'); i >= 0 {
		tail = tail[i+1:]
	}
	return append(head, tail...), nil
}

// ReadTail returns up to n bytes from the end of the file, starting at a line boundary.
func ReadTail(path string, n int64) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		return nil, err
	}
	start := max(info.Size()-n, 0)
	data := make([]byte, info.Size()-start)
	if _, err := file.ReadAt(data, start); err != nil && err != io.EOF {
		return nil, err
	}
	if start > 0 {
		if i := bytes.IndexByte(data, '\n'); i >= 0 {
			data = data[i+1:]
		}
	}
	return data, nil
}
