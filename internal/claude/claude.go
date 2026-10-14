// Package claude finds the Claude Code CLI and asks it which sessions are open.
package claude

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/antoniolg/remote-sessions/internal/i18n"
)

// Agent is one entry of `claude agents --json`.
type Agent struct {
	SessionID string `json:"sessionId"`
	Kind      string `json:"kind"`
	Status    string `json:"status"`
	State     string `json:"state"`
	PID       int    `json:"pid"`
	Cwd       string `json:"cwd"`
	// StartedAt is when the process started, in Unix milliseconds.
	StartedAt int64 `json:"startedAt"`
}

// Started is when the process started, or the zero time if unknown.
func (a Agent) Started() time.Time {
	if a.StartedAt == 0 {
		return time.Time{}
	}
	return time.UnixMilli(a.StartedAt)
}

// RemoteControlSince reports whether a Remote Control bridge recorded after lastBefore (the latest
// transcript entry written before it) belongs to this run of the session rather than to an older one.
func (a Agent) RemoteControlSince(lastBefore time.Time) bool {
	return a.StartedAt > 0 && !lastBefore.IsZero() && !lastBefore.Before(time.UnixMilli(a.StartedAt))
}

// Locate returns the claude executable: an explicit path, PATH, or the usual install locations
// (services start with a minimal PATH).
func Locate(explicit string) (string, error) {
	if explicit != "" {
		return explicit, nil
	}
	if path, err := exec.LookPath("claude"); err == nil {
		return path, nil
	}
	home, _ := os.UserHomeDir()
	candidates := []string{
		filepath.Join(home, ".local", "bin", "claude"),
		filepath.Join(home, ".claude", "local", "claude"),
		"/opt/homebrew/bin/claude",
		"/usr/local/bin/claude",
		"/usr/bin/claude",
	}
	if runtime.GOOS == "windows" {
		candidates = []string{
			filepath.Join(home, ".local", "bin", "claude.exe"),
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Programs", "claude", "claude.exe"),
			filepath.Join(os.Getenv("APPDATA"), "npm", "claude.cmd"),
		}
	}
	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate, nil
		}
	}
	return "", errors.New(i18n.T("claude_not_found"))
}

// Version returns `claude --version`.
func Version(bin string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, bin, "--version").Output()
	return strings.TrimSpace(string(out)), err
}

// Agents caches `claude agents --json` for a few seconds; the list endpoint calls it on every refresh.
type Agents struct {
	Bin string
	mu  sync.Mutex
	at  time.Time
	val map[string]Agent
}

const agentsTTL = 3 * time.Second

func (a *Agents) Running() map[string]Agent {
	a.mu.Lock()
	defer a.mu.Unlock()
	if time.Since(a.at) < agentsTTL && a.val != nil {
		return a.val
	}
	val := map[string]Agent{}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if out, err := exec.CommandContext(ctx, a.Bin, "agents", "--json").Output(); err == nil {
		var agents []Agent
		if json.Unmarshal(out, &agents) == nil {
			for _, agent := range agents {
				if agent.SessionID != "" {
					val[agent.SessionID] = agent
				}
			}
		}
	}
	a.val, a.at = val, time.Now()
	return val
}

// Invalidate forces the next Running call to ask the CLI again.
func (a *Agents) Invalidate() {
	a.mu.Lock()
	a.at = time.Time{}
	a.mu.Unlock()
}
