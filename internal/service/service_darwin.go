package service

import (
	"fmt"
	"html"
	"os"
	"path/filepath"
	"strconv"
)

func plistPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "Library", "LaunchAgents", launchdLabel+".plist")
}

func domain() string {
	return "gui/" + strconv.Itoa(os.Getuid())
}

func Install(exe string) error {
	plist := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>%s</string>
  <key>ProgramArguments</key><array><string>%s</string><string>serve</string><string>--log</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>%s</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
</dict>
</plist>
`, launchdLabel, html.EscapeString(exe), html.EscapeString(pathEnv()))
	if err := os.MkdirAll(filepath.Dir(plistPath()), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(plistPath(), []byte(plist), 0o644); err != nil {
		return err
	}
	_ = run("launchctl", "bootout", domain()+"/"+launchdLabel)
	return run("launchctl", "bootstrap", domain(), plistPath())
}

func Uninstall() error {
	_ = run("launchctl", "bootout", domain()+"/"+launchdLabel)
	if err := os.Remove(plistPath()); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func Restart() error {
	return run("launchctl", "kickstart", "-k", domain()+"/"+launchdLabel)
}

func Installed() bool {
	_, err := os.Stat(plistPath())
	return err == nil
}
