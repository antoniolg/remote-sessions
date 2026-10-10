//go:build ignore

// Runs a command in a PTY for a few seconds and prints everything it wrote (debugging aid).
package main

import (
	"bytes"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/aymanbagabas/go-pty"
)

func main() {
	terminal, err := pty.New()
	if err != nil {
		panic(err)
	}
	_ = terminal.Resize(200, 50)
	cmd := terminal.Command(os.Args[1], os.Args[2:]...)
	if err := cmd.Start(); err != nil {
		panic(err)
	}
	var mu sync.Mutex
	var out bytes.Buffer
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := terminal.Read(buf)
			mu.Lock()
			out.Write(buf[:n])
			mu.Unlock()
			if err != nil {
				return
			}
		}
	}()
	if keys := os.Getenv("PROBE_KEYS"); keys != "" {
		time.Sleep(3 * time.Second)
		_, _ = terminal.Write([]byte(keys))
	}
	time.Sleep(8 * time.Second)
	_ = cmd.Process.Kill()
	mu.Lock()
	fmt.Printf("%d bytes: %q\n", out.Len(), out.String())
	mu.Unlock()
}
