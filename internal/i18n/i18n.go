// Package i18n translates the command line output. English is the fallback when the
// machine language is unknown or not translated.
package i18n

import (
	"fmt"
	"os"
	"strings"
	"sync"
)

var (
	once sync.Once
	lang string
)

// Lang is the detected language code ("en", "es", …).
func Lang() string {
	once.Do(func() { lang = pick(candidates()) })
	return lang
}

// pick returns the first candidate with translations.
func pick(candidates []string) string {
	for _, candidate := range candidates {
		code := normalize(candidate)
		if _, ok := catalogs[code]; ok {
			return code
		}
		if code != "" && code != "c" && code != "posix" {
			// The user's first real preference is untranslated: use English rather than a later choice.
			return "en"
		}
	}
	return "en"
}

// normalize turns "es_ES.UTF-8", "es-419" or "es" into "es".
func normalize(locale string) string {
	locale = strings.ToLower(strings.TrimSpace(locale))
	for _, separator := range []string{".", "@", "_", "-"} {
		locale, _, _ = strings.Cut(locale, separator)
	}
	return locale
}

func envCandidates() []string {
	var out []string
	if value := os.Getenv("REMOTE_SESSIONS_LANG"); value != "" {
		out = append(out, value)
	}
	for _, key := range []string{"LC_ALL", "LC_MESSAGES", "LANG"} {
		if value := os.Getenv(key); value != "" {
			out = append(out, value)
		}
	}
	if value := os.Getenv("LANGUAGE"); value != "" {
		out = append(out, strings.Split(value, ":")...)
	}
	return out
}

// T returns the translated message for key, formatted with args.
func T(key string, args ...any) string {
	message, ok := catalogs[Lang()][key]
	if !ok {
		message, ok = catalogs["en"][key]
	}
	if !ok {
		message = key
	}
	if len(args) == 0 {
		return message
	}
	return fmt.Sprintf(message, args...)
}
