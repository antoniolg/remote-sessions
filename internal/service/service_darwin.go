package service

import (
	"fmt"
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
	unload()
	// bootout returns before the old job is gone; bootstrap fails with error 5 until then.
	var err error
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

func Restart() error {
	return run("launchctl", "kickstart", "-k", domain()+"/"+launchdLabel)
}

func Installed() bool {
	_, err := os.Stat(plistPath())
	return err == nil
}
