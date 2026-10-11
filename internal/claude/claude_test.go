package claude

import (
	"testing"
	"time"
)

func TestRemoteControlSince(t *testing.T) {
	started := time.Date(2026, 10, 11, 12, 0, 0, 0, time.UTC)
	agent := Agent{StartedAt: started.UnixMilli()}
	cases := []struct {
		name       string
		lastBefore time.Time
		want       bool
	}{
		{"turned on during this run", started.Add(10 * time.Minute), true},
		{"left over from an earlier run", started.Add(-time.Hour), false},
		{"no timestamp before the bridge", time.Time{}, false},
	}
	for _, c := range cases {
		if got := agent.RemoteControlSince(c.lastBefore); got != c.want {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
	if (Agent{}).RemoteControlSince(started) {
		t.Error("an agent without startedAt can't tell")
	}
}
