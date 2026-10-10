package service

import (
	"fmt"
	"os/exec"
)

// Install registers a task that runs at logon. `conhost --headless` keeps the console window hidden.
func Install(exe string) error {
	command := fmt.Sprintf(`conhost.exe --headless "%s" serve --log`, exe)
	if err := run("schtasks", "/Create", "/TN", windowsTask, "/SC", "ONLOGON", "/RL", "LIMITED", "/TR", command, "/F"); err != nil {
		return err
	}
	return Restart()
}

func Uninstall() error {
	_ = run("schtasks", "/End", "/TN", windowsTask)
	return run("schtasks", "/Delete", "/TN", windowsTask, "/F")
}

func Restart() error {
	_ = run("schtasks", "/End", "/TN", windowsTask)
	return run("schtasks", "/Run", "/TN", windowsTask)
}

func Installed() bool {
	return exec.Command("schtasks", "/Query", "/TN", windowsTask).Run() == nil
}
