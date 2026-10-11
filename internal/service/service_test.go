package service

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCopyExecutableFollowsSymlinksAndReplacesAtomically(t *testing.T) {
	dir := t.TempDir()
	cellar := filepath.Join(dir, "Cellar", "remote-sessions", "0.2.3", "bin", "remote-sessions")
	if err := os.MkdirAll(filepath.Dir(cellar), 0o755); err != nil {
		t.Fatal(err)
	}
	os.WriteFile(cellar, []byte("new version"), 0o755)
	link := filepath.Join(dir, "bin-remote-sessions")
	if err := os.Symlink(cellar, link); err != nil {
		t.Fatal(err)
	}
	stable := filepath.Join(dir, "support", "bin", "remote-sessions")
	os.MkdirAll(filepath.Dir(stable), 0o755)
	os.WriteFile(stable, []byte("old version"), 0o755)

	if same, _ := sameContent(link, stable); same {
		t.Fatal("different files reported as equal")
	}
	if err := copyExecutable(link, stable); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(stable)
	info, _ := os.Lstat(stable)
	if string(data) != "new version" || info.Mode()&os.ModeSymlink != 0 || info.Mode().Perm() != 0o755 {
		t.Fatalf("stable copy = %q, mode %v; want a real executable file with the new content", data, info.Mode())
	}
	if same, err := sameContent(link, stable); err != nil || !same {
		t.Fatalf("after copying: same=%v err=%v", same, err)
	}
	// Copying a file onto itself is a no-op, not a truncation.
	if err := copyExecutable(stable, stable); err != nil {
		t.Fatal(err)
	}
	if data, _ := os.ReadFile(stable); string(data) != "new version" {
		t.Fatalf("self copy changed the file: %q", data)
	}
}
