// Package service installs `remote-sessions serve` to start with the user session:
// a LaunchAgent on macOS, a systemd user unit on Linux and a logon task on Windows.
package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	launchdLabel = "com.antonioleiva.remote-sessions"
	systemdUnit  = "remote-sessions.service"
	windowsTask  = "Remote Sessions"
)

// Executable prefers the stable path on PATH (e.g. Homebrew's bin symlink) so upgrades keep working.
func Executable() (string, error) {
	self, err := os.Executable()
	if err != nil {
		return "", err
	}
	if onPath, err := exec.LookPath("remote-sessions"); err == nil {
		a, errA := filepath.EvalSymlinks(onPath)
		b, errB := filepath.EvalSymlinks(self)
		if errA == nil && errB == nil && a == b {
			if abs, err := filepath.Abs(onPath); err == nil {
				return abs, nil
			}
		}
	}
	return self, nil
}

func run(name string, args ...string) error {
	out, err := exec.Command(name, args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s %s: %v: %s", name, strings.Join(args, " "), err, strings.TrimSpace(string(out)))
	}
	return nil
}

// pathEnv gives services a PATH where claude and its helpers are found.
func pathEnv() string {
	home, _ := os.UserHomeDir()
	dirs := []string{filepath.Join(home, ".local", "bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"}
	return strings.Join(dirs, string(os.PathListSeparator))
}
