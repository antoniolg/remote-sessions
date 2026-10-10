package main

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/antoniolg/remote-sessions/internal/transcripts"
)

// requestFolderAccess opens, once, every folder in Documents, Desktop or Downloads that has a
// conversation. On macOS a background service needs a privacy permission for those folders; doing
// it at startup makes macOS ask right after `setup`, while the user is at the computer, instead of
// when the phone first connects. Each open blocks until the user answers, so it runs in goroutines.
func requestFolderAccess(store *transcripts.Store) {
	if runtime.GOOS != "darwin" {
		return
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}
	protected := []string{"Documents", "Desktop", "Downloads", filepath.Join("Library", "Mobile Documents")}
	summaries, err := store.List()
	if err != nil {
		return
	}
	seen := map[string]bool{}
	for _, summary := range summaries {
		for _, dir := range protected {
			root := filepath.Join(home, dir) + string(filepath.Separator)
			if strings.HasPrefix(summary.Cwd+string(filepath.Separator), root) && !seen[dir] {
				seen[dir] = true
				go func(path string) {
					if file, err := os.Open(path); err == nil {
						_, _ = file.Readdirnames(1)
						file.Close()
					}
				}(summary.Cwd)
			}
		}
	}
}
