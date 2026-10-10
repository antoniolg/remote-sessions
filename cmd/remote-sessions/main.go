// Command remote-sessions lets the Remote Sessions phone apps list and resume Claude Code sessions.
package main

import (
	"fmt"
	"os"

	"github.com/antoniolg/remote-sessions/internal/i18n"
)

// version is set at build time with -ldflags "-X main.version=…".
var version = "dev"

func main() {
	if len(os.Args) < 2 {
		fmt.Print(i18n.T("usage"))
		os.Exit(2)
	}
	args := os.Args[2:]
	var err error
	switch os.Args[1] {
	case "setup":
		err = setup()
	case "pair":
		err = pair(args)
	case "doctor":
		err = doctor()
	case "serve":
		err = serve(args)
	case "service":
		err = serviceCommand(args)
	case "version", "--version", "-v":
		fmt.Println("remote-sessions", version)
	case "help", "--help", "-h":
		fmt.Print(i18n.T("usage"))
	default:
		fmt.Fprintf(os.Stderr, "%s\n\n%s", i18n.T("unknown_command", os.Args[1]), i18n.T("usage"))
		os.Exit(2)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, i18n.T("error"), err)
		os.Exit(1)
	}
}
