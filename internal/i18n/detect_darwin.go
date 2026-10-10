package i18n

import (
	"os/exec"
	"regexp"
)

var quoted = regexp.MustCompile(`"?([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]+)*)"?`)

// candidates prefers the system language list; Terminal's LANG often follows the region instead.
func candidates() []string {
	var out []string
	if value := envOverride(); value != "" {
		out = append(out, value)
	}
	if data, err := exec.Command("defaults", "read", "-g", "AppleLanguages").Output(); err == nil {
		for _, match := range quoted.FindAllStringSubmatch(string(data), -1) {
			out = append(out, match[1])
		}
	}
	return append(out, envCandidates()...)
}
