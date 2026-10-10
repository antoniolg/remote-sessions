//go:build !darwin && !windows

package i18n

func candidates() []string {
	return envCandidates()
}
