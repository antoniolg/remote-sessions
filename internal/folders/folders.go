// Package folders lets a paired phone browse the folders under the user's home directory,
// to pick where a new Claude Code session starts.
package folders

import (
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

var (
	// ErrOutside means the path is not inside the home directory.
	ErrOutside = errors.New("outside the home directory")
	// ErrNotFolder means the path does not exist or is not a folder.
	ErrNotFolder = errors.New("not a folder")
	// ErrAccess means the operating system does not let this service read the folder
	// (on macOS, Documents, Desktop and Downloads need a privacy permission).
	ErrAccess = errors.New("folder access")
)

// Folder is one entry of a listing.
type Folder struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// Listing is a folder and its subfolders. Parent is empty at the home directory.
type Listing struct {
	Path    string   `json:"path"`
	Parent  string   `json:"parent,omitempty"`
	Home    string   `json:"home"`
	Folders []Folder `json:"folders"`
}

// Resolve returns the clean absolute form of path ("" or "~" is home) if it is a folder inside home.
func Resolve(home, path string) (string, error) {
	home = filepath.Clean(home)
	switch {
	case path == "" || path == "~":
		path = home
	case strings.HasPrefix(path, "~/") || strings.HasPrefix(path, `~\`):
		path = filepath.Join(home, path[2:])
	}
	if !filepath.IsAbs(path) {
		return "", ErrOutside
	}
	path = filepath.Clean(path)
	if !inside(home, path) {
		return "", ErrOutside
	}
	// Follow symlinks so a link inside home cannot lead outside it.
	if real, err := filepath.EvalSymlinks(path); err == nil {
		realHome, _ := filepath.EvalSymlinks(home)
		if realHome == "" {
			realHome = home
		}
		if !inside(realHome, real) {
			return "", ErrOutside
		}
	}
	info, err := os.Stat(path)
	if err != nil || !info.IsDir() {
		return "", ErrNotFolder
	}
	return path, nil
}

func inside(home, path string) bool {
	rel, err := filepath.Rel(home, path)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel)
}

// List returns the visible subfolders of path, sorted by name. Hidden folders are skipped.
func List(home, path string, timeout time.Duration) (Listing, error) {
	dir, err := Resolve(home, path)
	if err != nil {
		return Listing{}, err
	}
	type result struct {
		entries []os.DirEntry
		err     error
	}
	done := make(chan result, 1)
	// A folder macOS protects can block until the user answers a permission dialog.
	go func() {
		entries, err := os.ReadDir(dir)
		done <- result{entries, err}
	}()
	var r result
	select {
	case r = <-done:
	case <-time.After(timeout):
		return Listing{}, ErrAccess
	}
	if r.err != nil && len(r.entries) == 0 {
		if errors.Is(r.err, os.ErrPermission) {
			return Listing{}, ErrAccess
		}
		return Listing{}, r.err
	}
	listing := Listing{Path: dir, Home: filepath.Clean(home), Folders: []Folder{}}
	if dir != listing.Home {
		listing.Parent = filepath.Dir(dir)
	}
	for _, entry := range r.entries {
		name := entry.Name()
		if strings.HasPrefix(name, ".") || !isDir(dir, entry) {
			continue
		}
		listing.Folders = append(listing.Folders, Folder{Name: name, Path: filepath.Join(dir, name)})
	}
	sort.Slice(listing.Folders, func(i, j int) bool {
		return strings.ToLower(listing.Folders[i].Name) < strings.ToLower(listing.Folders[j].Name)
	})
	return listing, nil
}

// isDir also accepts symlinks to folders that stay inside home.
func isDir(dir string, entry os.DirEntry) bool {
	if entry.IsDir() {
		return true
	}
	if entry.Type()&os.ModeSymlink == 0 {
		return false
	}
	info, err := os.Stat(filepath.Join(dir, entry.Name()))
	return err == nil && info.IsDir()
}
