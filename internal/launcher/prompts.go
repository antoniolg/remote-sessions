package launcher

import (
	"errors"
	"os"
	"regexp"
	"strings"
	"time"
)

var (
	// ErrTrustRequired means Claude Code asks whether to trust the session's folder; the user decides.
	ErrTrustRequired = errors.New("trust required")
	// ErrFolderAccess means the operating system does not let this service open the folder
	// (on macOS, Documents, Desktop and Downloads need a privacy permission).
	ErrFolderAccess = errors.New("folder access")
)

// PromptError is an unexpected question Claude Code is waiting on.
type PromptError struct{ Text string }

func (e *PromptError) Error() string { return "Claude Code is waiting for an answer: " + e.Text }

var remoteURL = regexp.MustCompile(`https://claude\.ai/code/session_[A-Za-z0-9]+`)

// squash removes whitespace so text drawn with cursor moves still matches ("Is\x1b[4Gthis" → "Isthis").
func squash(text string) string {
	return strings.ToLower(strings.Join(strings.Fields(text), ""))
}

type prompt int

const (
	noPrompt prompt = iota
	trustPrompt
	browserPrompt
	unknownPrompt
)

// detectPrompt recognises the questions Claude Code can ask while starting.
func detectPrompt(screen string) prompt {
	s := squash(screen)
	switch {
	case strings.Contains(s, "itrustthisfolder") || strings.Contains(s, "isthisaprojectyoutrust"):
		return trustPrompt
	case strings.Contains(s, "esctokeepbrowsertoolsoff"):
		return browserPrompt
	case strings.Contains(s, "entertoconfirm"):
		return unknownPrompt
	}
	return noPrompt
}

const (
	keyDown   = "\x1b[B"
	keyEnter  = "\r"
	keyEscape = "\x1b"
)

// canOpen reports whether the folder can be read within the timeout. On macOS a folder
// protected by privacy settings blocks open() until someone answers the permission dialog.
func canOpen(dir string, timeout time.Duration) bool {
	result := make(chan bool, 1)
	go func() {
		file, err := os.Open(dir)
		if err == nil {
			_, err = file.Readdirnames(1)
			file.Close()
		}
		result <- err == nil || errors.Is(err, os.ErrNotExist) || err.Error() == "EOF"
	}()
	select {
	case ok := <-result:
		return ok
	case <-time.After(timeout):
		return false
	}
}

// childEnv drops the markers Claude Code sets for its own child processes; inherited, they make
// the resumed session think it is nested and stop saving its transcript.
func childEnv() []string {
	var env []string
	for _, entry := range os.Environ() {
		if strings.HasPrefix(entry, "CLAUDE_CODE_") || strings.HasPrefix(entry, "CLAUDECODE=") || strings.HasPrefix(entry, "TERM=") {
			continue
		}
		env = append(env, entry)
	}
	return append(env, "TERM=xterm-256color", "COLORTERM=truecolor")
}
