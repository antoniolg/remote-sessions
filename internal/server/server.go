// Package server exposes the v1 API described in docs/API.md.
package server

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/antoniolg/remote-sessions/internal/claude"
	"github.com/antoniolg/remote-sessions/internal/folders"
	"github.com/antoniolg/remote-sessions/internal/launcher"
	"github.com/antoniolg/remote-sessions/internal/transcripts"
)

type Server struct {
	ID       string
	Name     string
	Version  string
	Token    string
	Store    *transcripts.Store
	Agents   *claude.Agents
	Launcher *launcher.Launcher
	// Home limits the folders a phone can browse and start sessions in (the user's home by default).
	Home string
}

type running struct {
	Kind   string `json:"kind"`
	Status string `json:"status,omitempty"`
}

type remote struct {
	URL string `json:"url"`
}

type session struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	LastPrompt *string   `json:"lastPrompt"`
	Cwd        *string   `json:"cwd"`
	Project    *string   `json:"project"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Running    *running  `json:"running"`
	Remote     *remote   `json:"remote"`
}

func nullable(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

// Handler routes every endpoint and logs each request.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.health)
	mux.HandleFunc("GET /v1/sessions", s.auth(s.list))
	mux.HandleFunc("POST /v1/sessions", s.auth(s.create))
	mux.HandleFunc("GET /v1/folders", s.auth(s.folders))
	mux.HandleFunc("GET /v1/sessions/{id}/messages", s.auth(s.messages))
	mux.HandleFunc("POST /v1/sessions/{id}/remote-control", s.auth(s.connect))
	mux.HandleFunc("DELETE /v1/sessions/{id}/remote-control", s.auth(s.disconnect))
	return logRequests(mux)
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	expected := []byte("Bearer " + s.Token)
	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), expected) != 1 {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid token. Pair the phone again.")
			return
		}
		next(w, r)
	}
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": s.ID, "name": s.Name, "version": s.Version})
}

func (s *Server) present(summary transcripts.Summary, agents map[string]claude.Agent) session {
	out := session{
		ID:         summary.ID,
		Title:      summary.Title(),
		LastPrompt: nullable(transcripts.Clip(summary.LastPrompt, 200)),
		Cwd:        nullable(summary.Cwd),
		Project:    nullable(summary.Project()),
		UpdatedAt:  summary.UpdatedAt.UTC(),
	}
	if managed, ok := s.Launcher.Get(summary.ID); ok {
		out.Running = &running{Kind: "remote-sessions"}
		if managed.URL != "" {
			out.Remote = &remote{URL: managed.URL}
		}
	} else if agent, ok := agents[summary.ID]; ok {
		out.Running = &running{Kind: agent.Kind, Status: agent.Status}
		// Open on the computer with /remote-control turned on: the phone can open it too.
		if summary.BridgeSessionID != "" && agent.RemoteControlSince(summary.BridgeAfter) {
			out.Remote = &remote{URL: transcripts.BridgeURL(summary.BridgeSessionID)}
		}
	}
	return out
}

func (s *Server) list(w http.ResponseWriter, _ *http.Request) {
	summaries, err := s.Store.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", "Could not read the Claude Code conversations: "+err.Error())
		return
	}
	agents := s.Agents.Running()
	sessions := make([]session, 0, len(summaries))
	for _, summary := range summaries {
		sessions = append(sessions, s.present(summary, agents))
	}
	writeJSON(w, http.StatusOK, map[string]any{"sessions": sessions})
}

func (s *Server) messages(w http.ResponseWriter, r *http.Request) {
	path, ok := s.Store.Find(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "Conversation not found")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 60
	}
	messages, err := transcripts.RecentMessages(path, min(limit, 200))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"messages": messages})
}

func (s *Server) connect(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	path, ok := s.Store.Find(id)
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "Conversation not found")
		return
	}
	if managed, ok := s.Launcher.Get(id); ok && managed.URL != "" {
		writeJSON(w, http.StatusOK, map[string]any{"url": managed.URL, "reused": true})
		return
	}
	if _, open := s.Agents.Running()[id]; open {
		writeError(w, http.StatusConflict, "open_elsewhere", "The conversation is already open on the computer. Close it there or run /remote-control in it.")
		return
	}
	summary, err := s.Store.SummaryFor(path)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	var body struct {
		TrustFolder bool `json:"trustFolder"`
	}
	_ = json.NewDecoder(io.LimitReader(r.Body, 4096)).Decode(&body)
	// Keep going if the phone gives up: the session stays useful and the next tap reuses it.
	managed, err := s.Launcher.Start(context.WithoutCancel(r.Context()), id, path, summary.Cwd, summary.Title(),
		launcher.Options{TrustFolder: body.TrustFolder})
	s.Agents.Invalidate()
	if err != nil {
		launchError(w, id, summary.Cwd, managed, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"url": managed.URL, "reused": false})
}

// macAccessHint names the file to allow: the service runs a copy at a fixed path (see internal/service).
const macAccessHint = ". On macOS, give Full Disk Access to ~/Library/Application Support/remote-sessions/bin/remote-sessions " +
	"in System Settings › Privacy & Security, or allow it when macOS asks about Documents, Desktop or Downloads."

// launchError answers a failed Start or Create with the codes the apps translate.
func launchError(w http.ResponseWriter, id, cwd string, managed *launcher.Managed, err error) {
	var promptErr *launcher.PromptError
	switch {
	case errors.Is(err, launcher.ErrTrustRequired):
		writeJSON(w, http.StatusConflict, map[string]string{"code": "trust_required", "folder": cwd,
			"error": "Claude Code asks whether you trust " + cwd + ". Confirm to trust it and connect."})
	case errors.Is(err, launcher.ErrFolderAccess):
		writeError(w, http.StatusForbidden, "folder_access", "The computer does not let Remote Sessions open "+cwd+macAccessHint)
	case errors.As(err, &promptErr):
		log.Printf("remote-control %s: %v", id, err)
		writeError(w, http.StatusBadGateway, "prompt_blocked", promptErr.Error())
	case errors.Is(err, launcher.ErrTimeout):
		log.Printf("remote-control %s: timeout. Terminal:\n%s", id, managed.Screen())
		writeError(w, http.StatusGatewayTimeout, "remote_control_timeout", "Remote Control did not answer in time. Check that Claude Code is logged in with your Claude account.")
	default:
		if managed != nil {
			log.Printf("remote-control %s: %v. Terminal:\n%s", id, err, managed.Screen())
		}
		writeError(w, http.StatusBadGateway, "launch_failed", "Could not start Remote Control: "+err.Error())
	}
}

func (s *Server) home() string {
	if s.Home != "" {
		return s.Home
	}
	home, _ := os.UserHomeDir()
	return home
}

// folders lists the subfolders of ?path= (home by default) to pick where a new session starts.
func (s *Server) folders(w http.ResponseWriter, r *http.Request) {
	listing, err := folders.List(s.home(), r.URL.Query().Get("path"), 3*time.Second)
	if err != nil {
		folderError(w, r.URL.Query().Get("path"), err)
		return
	}
	writeJSON(w, http.StatusOK, listing)
}

func folderError(w http.ResponseWriter, path string, err error) {
	switch {
	case errors.Is(err, folders.ErrOutside):
		writeError(w, http.StatusBadRequest, "outside_home", "Only folders inside your home folder can be used")
	case errors.Is(err, folders.ErrNotFolder):
		writeError(w, http.StatusNotFound, "not_found", "Folder not found: "+path)
	case errors.Is(err, folders.ErrAccess):
		writeError(w, http.StatusForbidden, "folder_access", "The computer does not let Remote Sessions open "+path+macAccessHint)
	default:
		writeError(w, http.StatusInternalServerError, "internal", err.Error())
	}
}

// create starts a new Claude Code session with Remote Control in the given folder.
func (s *Server) create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Cwd         string `json:"cwd"`
		Title       string `json:"title"`
		TrustFolder bool   `json:"trustFolder"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 16<<10)).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid body")
		return
	}
	cwd, err := folders.Resolve(s.home(), body.Cwd)
	if err != nil {
		folderError(w, body.Cwd, err)
		return
	}
	title := strings.Join(strings.Fields(transcripts.Clip(body.Title, 80)), " ")
	managed, err := s.Launcher.Create(cwd, s.Store.ProjectDir(cwd), title, launcher.Options{TrustFolder: body.TrustFolder})
	s.Agents.Invalidate()
	if err != nil {
		id := ""
		if managed != nil {
			id = managed.SessionID
		}
		launchError(w, id, cwd, managed, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": managed.SessionID, "url": managed.URL, "cwd": cwd})
}

func (s *Server) disconnect(w http.ResponseWriter, r *http.Request) {
	if !s.Launcher.Stop(r.PathValue("id")) {
		writeError(w, http.StatusNotFound, "not_found", "Remote Sessions is not running this conversation")
		return
	}
	s.Agents.Invalidate()
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// writeError sends a stable code for the apps to translate and an English message as fallback.
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]string{"code": code, "error": message})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		if r.URL.Path != "/health" {
			log.Printf("%s %s %s %d %s", r.RemoteAddr, r.Method, r.URL.Path, recorder.status, time.Since(start).Round(time.Millisecond))
		}
	})
}
