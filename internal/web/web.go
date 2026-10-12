// Package web serves the browser client (a PWA) at /app/, an alternative to the store apps.
// It uses the same v1 API: the token arrives in the URL fragment when pairing and stays in the browser.
package web

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed static
var files embed.FS

// Handler serves the static client. Everything is public: the data behind it needs the token.
func Handler() http.Handler {
	static, _ := fs.Sub(files, "static")
	fileServer := http.StripPrefix("/app/", http.FileServerFS(static))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := w.Header()
		// The token lives in localStorage: only our own scripts may run, and nothing loads from elsewhere.
		header.Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
		header.Set("Referrer-Policy", "no-referrer")
		header.Set("X-Content-Type-Options", "nosniff")
		// The service worker does the caching; the browser always asks so updates arrive at once.
		header.Set("Cache-Control", "no-cache")
		if r.URL.Path == "/app/sw.js" {
			header.Set("Service-Worker-Allowed", "/app/")
		}
		fileServer.ServeHTTP(w, r)
	})
}
