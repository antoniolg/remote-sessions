package folders

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestList(t *testing.T) {
	home := t.TempDir()
	for _, dir := range []string{"projects/web", "projects/Api", "projects/.git", "Documents"} {
		if err := os.MkdirAll(filepath.Join(home, dir), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(home, "projects", "notes.txt"), nil, 0o644); err != nil {
		t.Fatal(err)
	}

	root, err := List(home, "", time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if root.Parent != "" || len(root.Folders) != 2 || root.Folders[0].Name != "Documents" {
		t.Fatalf("home listing = %+v", root)
	}

	projects, err := List(home, "~/projects", time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if projects.Parent != home {
		t.Errorf("parent = %s, want %s", projects.Parent, home)
	}
	names := []string{}
	for _, f := range projects.Folders {
		names = append(names, f.Name)
	}
	if len(names) != 2 || names[0] != "Api" || names[1] != "web" {
		t.Errorf("folders = %v, want [Api web] (sorted, no hidden folders or files)", names)
	}
}

func TestResolveStaysInsideHome(t *testing.T) {
	home := t.TempDir()
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(home, "link")); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{outside, filepath.Join(home, ".."), "relative/path", filepath.Join(home, "link")} {
		if _, err := Resolve(home, path); !errors.Is(err, ErrOutside) {
			t.Errorf("Resolve(%q) err = %v, want ErrOutside", path, err)
		}
	}
	if _, err := Resolve(home, filepath.Join(home, "missing")); !errors.Is(err, ErrNotFolder) {
		t.Errorf("missing folder err = %v, want ErrNotFolder", err)
	}
}
