package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

func unitPath() string {
	base, err := os.UserConfigDir()
	if err != nil {
		home, _ := os.UserHomeDir()
		base = filepath.Join(home, ".config")
	}
	return filepath.Join(base, "systemd", "user", systemdUnit)
}

func Install(exe string) error {
	unit := fmt.Sprintf(`[Unit]
Description=Remote Sessions (Claude Code from your phone)
After=network-online.target

[Service]
ExecStart=%s serve --log
Environment=PATH=%s
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
`, strconv.Quote(exe), pathEnv())
	if err := os.MkdirAll(filepath.Dir(unitPath()), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(unitPath(), []byte(unit), 0o644); err != nil {
		return err
	}
	if err := run("systemctl", "--user", "daemon-reload"); err != nil {
		return err
	}
	if err := run("systemctl", "--user", "enable", "--now", systemdUnit); err != nil {
		return err
	}
	// Without lingering the service stops when the user logs out; best effort, may need privileges.
	if user := os.Getenv("USER"); user != "" {
		_ = run("loginctl", "enable-linger", user)
	}
	return nil
}

func Uninstall() error {
	_ = run("systemctl", "--user", "disable", "--now", systemdUnit)
	if err := os.Remove(unitPath()); err != nil && !os.IsNotExist(err) {
		return err
	}
	return run("systemctl", "--user", "daemon-reload")
}

func Restart() error {
	return run("systemctl", "--user", "restart", systemdUnit)
}

func Installed() bool {
	_, err := os.Stat(unitPath())
	return err == nil
}

// UpdateFromSource only matters on macOS, where the service runs a copy of the executable.
func UpdateFromSource() (bool, error) { return false, nil }
