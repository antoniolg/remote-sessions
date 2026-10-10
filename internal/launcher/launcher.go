// Package launcher resumes Claude Code sessions with Remote Control inside pseudo-terminals.
// `claude --bg` does not bring Remote Control up, so each session runs interactively in a PTY
// owned by this process (ConPTY on Windows).
package launcher

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/antoniolg/remote-sessions/internal/transcripts"
	"github.com/aymanbagabas/go-pty"
)

const (
	screenKeep = 16 << 10
	cols       = 200
	rows       = 50
)

// ErrTimeout means the session started but Remote Control did not publish its URL in time.
var ErrTimeout = errors.New("timeout")

// Managed is a session this server started.
type Managed struct {
	SessionID string
	URL       string
	Started   time.Time
	pty       pty.Pty
	cmd       *pty.Cmd
	screen    *ring
	done      chan struct{}
}

// Screen returns the latest terminal output, useful to explain a failure.
func (m *Managed) Screen() string {
	return m.screen.String()
}

type Launcher struct {
	ClaudeBin string
	Timeout   time.Duration
	mu        sync.Mutex
	sessions  map[string]*Managed
	starting  map[string]chan struct{}
}

func New(claudeBin string) *Launcher {
	return &Launcher{ClaudeBin: claudeBin, Timeout: 45 * time.Second, sessions: map[string]*Managed{}, starting: map[string]chan struct{}{}}
}

// Get returns a running session started by this server.
func (l *Launcher) Get(sessionID string) (*Managed, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	m, ok := l.sessions[sessionID]
	return m, ok
}

// Start resumes the session with Remote Control and waits for its claude.ai URL.
// Concurrent calls for the same session wait for the first one.
func (l *Launcher) Start(ctx context.Context, sessionID, transcript, cwd, title string) (*Managed, error) {
	l.mu.Lock()
	if m, ok := l.sessions[sessionID]; ok {
		if m.URL != "" {
			l.mu.Unlock()
			return m, nil
		}
		// A previous attempt is still running without a URL: start over instead of running two.
		l.mu.Unlock()
		l.Stop(sessionID)
		l.mu.Lock()
	}
	if wait, ok := l.starting[sessionID]; ok {
		l.mu.Unlock()
		select {
		case <-wait:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		if m, ok := l.Get(sessionID); ok && m.URL != "" {
			return m, nil
		}
		return nil, errors.New("could not start Remote Control")
	}
	wait := make(chan struct{})
	l.starting[sessionID] = wait
	l.mu.Unlock()
	defer func() {
		l.mu.Lock()
		delete(l.starting, sessionID)
		l.mu.Unlock()
		close(wait)
	}()
	return l.start(sessionID, transcript, cwd, title)
}

func (l *Launcher) start(sessionID, transcript, cwd, title string) (*Managed, error) {
	dir := filepath.Dir(transcript)
	offsets := snapshotOffsets(dir)
	if info, err := os.Stat(cwd); err != nil || !info.IsDir() {
		cwd, _ = os.UserHomeDir()
	}
	terminal, err := pty.New()
	if err != nil {
		return nil, err
	}
	_ = terminal.Resize(cols, rows)
	cmd := terminal.Command(l.ClaudeBin, "--resume", sessionID, "--remote-control", title)
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")
	if err := cmd.Start(); err != nil {
		terminal.Close()
		return nil, err
	}
	m := &Managed{SessionID: sessionID, Started: time.Now(), pty: terminal, cmd: cmd, screen: newRing(screenKeep), done: make(chan struct{})}
	// The TUI blocks if nobody reads its output or answers its terminal queries.
	go answerQueries(terminal, m.screen, cols, rows)
	go func() {
		_ = cmd.Wait()
		terminal.Close()
		close(m.done)
		l.mu.Lock()
		if l.sessions[sessionID] == m {
			delete(l.sessions, sessionID)
		}
		l.mu.Unlock()
	}()
	l.mu.Lock()
	l.sessions[sessionID] = m
	l.mu.Unlock()

	deadline := time.Now().Add(l.Timeout)
	for time.Now().Before(deadline) {
		if bridge := newBridge(dir, offsets, m.Started); bridge != "" {
			l.mu.Lock()
			m.URL = transcripts.BridgeURL(bridge)
			l.mu.Unlock()
			return m, nil
		}
		select {
		case <-m.done:
			return m, errors.New("Claude Code exited while resuming the session")
		case <-time.After(time.Second):
		}
	}
	// Don't leave a blank session behind: the next tap starts a fresh one.
	_ = m.cmd.Process.Kill()
	return m, ErrTimeout
}

// Stop ends a session this server started.
func (l *Launcher) Stop(sessionID string) bool {
	m, ok := l.Get(sessionID)
	if !ok {
		return false
	}
	_ = m.cmd.Process.Kill()
	select {
	case <-m.done:
	case <-time.After(5 * time.Second):
	}
	return true
}

// StopAll ends every managed session (on shutdown).
func (l *Launcher) StopAll() {
	l.mu.Lock()
	ids := make([]string, 0, len(l.sessions))
	for id := range l.sessions {
		ids = append(ids, id)
	}
	l.mu.Unlock()
	for _, id := range ids {
		l.Stop(id)
	}
}

func snapshotOffsets(dir string) map[string]int64 {
	offsets := map[string]int64{}
	entries, _ := os.ReadDir(dir)
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".jsonl") {
			if info, err := entry.Info(); err == nil {
				offsets[filepath.Join(dir, entry.Name())] = info.Size()
			}
		}
	}
	return offsets
}

// newBridge looks for a bridge-session record appended to any transcript in dir since the launch.
// Resuming can fork into a new transcript, so the whole project directory is watched.
func newBridge(dir string, offsets map[string]int64, since time.Time) string {
	entries, _ := os.ReadDir(dir)
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".jsonl") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		info, err := entry.Info()
		if err != nil || info.ModTime().Before(since.Add(-time.Second)) || info.Size() <= offsets[path] {
			continue
		}
		data, err := readFrom(path, offsets[path])
		if err != nil {
			continue
		}
		found := ""
		for _, line := range bytes.Split(data, []byte("\n")) {
			if !bytes.Contains(line, []byte(`"bridge-session"`)) {
				continue
			}
			var r struct {
				BridgeSessionID string `json:"bridgeSessionId"`
			}
			if json.Unmarshal(line, &r) == nil && r.BridgeSessionID != "" {
				found = r.BridgeSessionID
			}
		}
		if found != "" {
			return found
		}
	}
	return ""
}

func readFrom(path string, offset int64) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return nil, err
	}
	return io.ReadAll(file)
}
