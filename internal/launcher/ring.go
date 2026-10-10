package launcher

import (
	"regexp"
	"strconv"
	"strings"
	"sync"
)

// ring keeps the last n bytes written to it.
type ring struct {
	mu   sync.Mutex
	data []byte
	max  int
}

func newRing(max int) *ring {
	return &ring{max: max}
}

func (r *ring) Write(p []byte) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.data = append(r.data, p...)
	if extra := len(r.data) - r.max; extra > 0 {
		r.data = r.data[extra:]
	}
	return len(p), nil
}

var ansi = regexp.MustCompile(`\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*(\x07|\x1b\\)|\x1b[@-_]`)

// String returns the buffered output without terminal escape sequences, or the raw
// escaped bytes when there is no visible text (that shows what the program was waiting for).
func (r *ring) String() string {
	r.mu.Lock()
	defer r.mu.Unlock()
	if text := strings.TrimSpace(ansi.ReplaceAllString(string(r.data), "")); text != "" {
		return text
	}
	raw := r.data
	if len(raw) > 2000 {
		raw = raw[len(raw)-2000:]
	}
	return strconv.Quote(string(raw))
}
