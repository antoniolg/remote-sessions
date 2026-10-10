package main

import (
	"context"
	"crypto/tls"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/antoniolg/remote-sessions/internal/claude"
	"github.com/antoniolg/remote-sessions/internal/config"
	"github.com/antoniolg/remote-sessions/internal/discovery"
	"github.com/antoniolg/remote-sessions/internal/i18n"
	"github.com/antoniolg/remote-sessions/internal/launcher"
	"github.com/antoniolg/remote-sessions/internal/server"
	"github.com/antoniolg/remote-sessions/internal/transcripts"
)

const maxLogBytes = 5 << 20

// openLog appends to the service log, starting over when it grows too big.
func openLog(path string) (io.Writer, error) {
	if info, err := os.Stat(path); err == nil && info.Size() > maxLogBytes {
		_ = os.Rename(path, path+".1")
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		return nil, err
	}
	return io.MultiWriter(os.Stderr, file), nil
}

func serve(args []string) error {
	flags := flag.NewFlagSet("serve", flag.ContinueOnError)
	toFile := flags.Bool("log", false, i18n.T("flag_log"))
	claudeFlag := flags.String("claude", "", i18n.T("flag_claude"))
	if err := flags.Parse(args); err != nil {
		return err
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if *toFile {
		writer, err := openLog(cfg.LogPath())
		if err != nil {
			return err
		}
		log.SetOutput(writer)
	}
	cert, err := cfg.Certificate()
	if err != nil {
		return fmt.Errorf("certificate: %w", err)
	}
	claudeBin, err := claude.Locate(firstNonEmpty(*claudeFlag, cfg.ClaudeBin))
	if err != nil {
		return err
	}
	launch := launcher.New(claudeBin)
	api := &server.Server{
		ID: cfg.ID, Name: cfg.ComputerName(), Version: version, Token: cfg.Token,
		Store: transcripts.NewStore(transcripts.DefaultDir()), Agents: &claude.Agents{Bin: claudeBin}, Launcher: launch,
	}
	httpServer := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           api.Handler(),
		TLSConfig:         &tls.Config{Certificates: []tls.Certificate{cert}, MinVersion: tls.VersionTLS12},
		ReadHeaderTimeout: 10 * time.Second,
	}
	stopAdvertising, err := discovery.Advertise(cfg.ID, cfg.ComputerName(), cfg.Port)
	if err != nil {
		log.Printf("mDNS unavailable: %v", err)
	}
	defer stopAdvertising()

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-signals
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(ctx)
	}()

	log.Printf("Remote Sessions %s listening on https://0.0.0.0:%d (claude: %s)", version, cfg.Port, claudeBin)
	err = httpServer.ListenAndServeTLS("", "")
	launch.StopAll()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
