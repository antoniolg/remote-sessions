package i18n

import "golang.org/x/sys/windows"

func candidates() []string {
	var out []string
	if value := envOverride(); value != "" {
		out = append(out, value)
	}
	if languages, err := windows.GetUserPreferredUILanguages(windows.MUI_LANGUAGE_NAME); err == nil {
		out = append(out, languages...)
	}
	return append(out, envCandidates()...)
}
