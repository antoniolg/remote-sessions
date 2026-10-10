package transcripts

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

// SessionIDPattern matches Claude Code session ids (UUIDs).
var SessionIDPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// Store lists transcripts under a projects directory, caching summaries by size and mtime.
type Store struct {
	Dir   string
	mu    sync.Mutex
	cache map[string]cached
}

type cached struct {
	size    int64
	modTime time.Time
	summary Summary
}

func NewStore(dir string) *Store {
	return &Store{Dir: dir, cache: map[string]cached{}}
}

// DefaultDir is ~/.claude/projects (CLAUDE_CONFIG_DIR is honoured like Claude Code does).
func DefaultDir() string {
	if dir := os.Getenv("CLAUDE_CONFIG_DIR"); dir != "" {
		return filepath.Join(dir, "projects")
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".claude", "projects")
}

func (s *Store) files() ([]string, error) {
	projects, err := os.ReadDir(s.Dir)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, project := range projects {
		if !project.IsDir() {
			continue
		}
		entries, err := os.ReadDir(filepath.Join(s.Dir, project.Name()))
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.Type().IsRegular() && strings.HasSuffix(entry.Name(), ".jsonl") {
				files = append(files, filepath.Join(s.Dir, project.Name(), entry.Name()))
			}
		}
	}
	return files, nil
}

// SummaryFor reads (or returns the cached) summary of one transcript file.
func (s *Store) SummaryFor(path string) (Summary, error) {
	info, err := os.Stat(path)
	if err != nil {
		return Summary{}, err
	}
	s.mu.Lock()
	entry, ok := s.cache[path]
	s.mu.Unlock()
	if ok && entry.size == info.Size() && entry.modTime.Equal(info.ModTime()) {
		return entry.summary, nil
	}
	data, err := readHeadTail(path, info.Size())
	if err != nil {
		return Summary{}, err
	}
	summary := Summarize(strings.TrimSuffix(filepath.Base(path), ".jsonl"), data)
	summary.UpdatedAt = info.ModTime()
	s.mu.Lock()
	s.cache[path] = cached{size: info.Size(), modTime: info.ModTime(), summary: summary}
	s.mu.Unlock()
	return summary, nil
}

// List returns every transcript with at least one message, newest first.
func (s *Store) List() ([]Summary, error) {
	files, err := s.files()
	if err != nil {
		return nil, err
	}
	summaries := make([]Summary, len(files))
	var wg sync.WaitGroup
	limit := make(chan struct{}, 8)
	for i, path := range files {
		wg.Add(1)
		go func() {
			defer wg.Done()
			limit <- struct{}{}
			defer func() { <-limit }()
			if summary, err := s.SummaryFor(path); err == nil {
				summaries[i] = summary
			}
		}()
	}
	wg.Wait()
	result := summaries[:0]
	for _, summary := range summaries {
		if summary.Messages > 0 {
			result = append(result, summary)
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].UpdatedAt.After(result[j].UpdatedAt) })
	return result, nil
}

// Find returns the transcript path of a session id.
func (s *Store) Find(id string) (string, bool) {
	if !SessionIDPattern.MatchString(id) {
		return "", false
	}
	projects, err := os.ReadDir(s.Dir)
	if err != nil {
		return "", false
	}
	for _, project := range projects {
		path := filepath.Join(s.Dir, project.Name(), id+".jsonl")
		if info, err := os.Stat(path); err == nil && info.Mode().IsRegular() {
			return path, true
		}
	}
	return "", false
}

// BridgeURL maps a bridge session id (cse_…) to its claude.ai URL.
func BridgeURL(bridgeSessionID string) string {
	if bridgeSessionID == "" {
		return ""
	}
	id := bridgeSessionID
	if strings.HasPrefix(id, "cse_") {
		id = "session_" + strings.TrimPrefix(id, "cse_")
	}
	return "https://claude.ai/code/" + id
}
