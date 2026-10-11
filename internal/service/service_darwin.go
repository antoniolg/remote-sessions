package service

import (
	"fmt"

	"github.com/antoniolg/remote-sessions/internal/config"
	"html"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"
)

func plistPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "Library", "LaunchAgents", launchdLabel+".plist")
}

func domain() string {
	return "gui/" + strconv.Itoa(os.Getuid())
}

// sourceEnv tells the service which installed executable to follow (see UpdateFromSource).
const sourceEnv = "REMOTE_SESSIONS_SOURCE"

// stablePath is where the LaunchAgent runs the server from. macOS ties privacy permissions such as
// Full Disk Access to the executable's real path, and Homebrew's changes with every version
// (Cellar/remote-sessions/<version>), so the service runs a copy whose path never changes.
func stablePath() (string, error) {
	dir, err := config.Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "bin", "remote-sessions"), nil
}

// Install copies exe to the stable path and runs that copy at login.
func Install(exe string) error {
	stable, err := stablePath()
	if err != nil {
		return err
	}
	if err := copyExecutable(exe, stable); err != nil {
		return fmt.Errorf("copy the executable: %w", err)
	}
	plist := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>%s</string>
  <key>ProgramArguments</key><array><string>%s</string><string>serve</string><string>--log</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>%s</string><key>%s</key><string>%s</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
</dict>
</plist>
`, launchdLabel, html.EscapeString(stable), html.EscapeString(pathEnv()), sourceEnv, html.EscapeString(exe))
	if err := os.MkdirAll(filepath.Dir(plistPath()), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(plistPath(), []byte(plist), 0o644); err != nil {
		return err
	}
	unload()
	// bootout returns before the old job is gone; bootstrap fails with error 5 until then.
	for attempt := 0; attempt < 10; attempt++ {
		if err = run("launchctl", "bootstrap", domain(), plistPath()); err == nil {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return err
}

// unload stops the job and waits until launchd forgets it.
func unload() {
	_ = run("launchctl", "bootout", domain()+"/"+launchdLabel)
	for attempt := 0; attempt < 20; attempt++ {
		if exec.Command("launchctl", "print", domain()+"/"+launchdLabel).Run() != nil {
			return
		}
		time.Sleep(250 * time.Millisecond)
	}
}

func Uninstall() error {
	unload()
	if err := os.Remove(plistPath()); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// UpdateFromSource replaces the running copy with the installed executable when they differ, so a
// Homebrew upgrade reaches the service without changing its path. It reports whether the copy
// changed; the caller then exits and launchd starts the new version.
func UpdateFromSource() (bool, error) {
	source := os.Getenv(sourceEnv)
	stable, err := stablePath()
	if source == "" || err != nil {
		return false, err
	}
	if self, err := os.Executable(); err != nil || !samePath(self, stable) {
		return false, err
	}
	if same, err := sameContent(source, stable); err != nil || same {
		return false, err
	}
	return true, copyExecutable(source, stable)
}

func Restart() error {
	return run("launchctl", "kickstart", "-k", domain()+"/"+launchdLabel)
}

func Installed() bool {
	_, err := os.Stat(plistPath())
	return err == nil
}
