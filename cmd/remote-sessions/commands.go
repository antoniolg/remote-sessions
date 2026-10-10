package main

import (
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/antoniolg/remote-sessions/internal/claude"
	"github.com/antoniolg/remote-sessions/internal/config"
	"github.com/antoniolg/remote-sessions/internal/i18n"
	"github.com/antoniolg/remote-sessions/internal/pairing"
	"github.com/antoniolg/remote-sessions/internal/service"
	"github.com/antoniolg/remote-sessions/internal/transcripts"
)

func pairingInfo(cfg *config.Config) (pairing.Info, error) {
	cert, err := cfg.Certificate()
	if err != nil {
		return pairing.Info{}, err
	}
	return pairing.Info{
		ID: cfg.ID, Name: cfg.ComputerName(), Port: cfg.Port, Hosts: pairing.Hosts(cfg.Hosts),
		Token: cfg.Token, Fingerprint: config.Fingerprint(cert),
	}, nil
}

func printPairing(info pairing.Info) {
	fmt.Println()
	fmt.Println(i18n.T("scan"))
	fmt.Println()
	info.PrintQR(os.Stdout)
	fmt.Println()
	fmt.Println(i18n.T("cannot_scan"))
	fmt.Println(info.URI())
	fmt.Println()
	fmt.Println(i18n.T("keep_secret"))
}

func pair(args []string) error {
	flags := flag.NewFlagSet("pair", flag.ContinueOnError)
	rotate := flags.Bool("rotate", false, i18n.T("flag_rotate"))
	if err := flags.Parse(args); err != nil {
		return err
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if *rotate {
		if err := cfg.RotateToken(); err != nil {
			return err
		}
		if service.Installed() {
			if err := service.Restart(); err != nil {
				return err
			}
		}
		fmt.Println(i18n.T("rotated"))
	}
	info, err := pairingInfo(cfg)
	if err != nil {
		return err
	}
	printPairing(info)
	return nil
}

func setup() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if _, err := claude.Locate(cfg.ClaudeBin); err != nil {
		return err
	}
	exe, err := service.Executable()
	if err != nil {
		return err
	}
	fmt.Println(i18n.T("installing"))
	if err := service.Install(exe); err != nil {
		return err
	}
	if err := waitForHealth(cfg, 15*time.Second); err != nil {
		return errors.New(i18n.T("service_not_ready", err, cfg.LogPath()))
	}
	fmt.Println(i18n.T("ready"))
	info, err := pairingInfo(cfg)
	if err != nil {
		return err
	}
	printPairing(info)
	return nil
}

func serviceCommand(args []string) error {
	if len(args) != 1 {
		return errors.New(i18n.T("service_usage"))
	}
	switch args[0] {
	case "install":
		exe, err := service.Executable()
		if err != nil {
			return err
		}
		return service.Install(exe)
	case "uninstall":
		return service.Uninstall()
	case "restart":
		return service.Restart()
	}
	return errors.New(i18n.T("unknown_action", args[0]))
}

// localClient trusts only this server's own certificate.
func localClient(cfg *config.Config) (*http.Client, error) {
	cert, err := cfg.Certificate()
	if err != nil {
		return nil, err
	}
	expected := config.Fingerprint(cert)
	return &http.Client{Timeout: 3 * time.Second, Transport: &http.Transport{TLSClientConfig: &tls.Config{
		InsecureSkipVerify: true, // trust comes from the pinned fingerprint below
		VerifyPeerCertificate: func(raw [][]byte, _ [][]*x509.Certificate) error {
			sum := sha256.Sum256(raw[0])
			if hex.EncodeToString(sum[:]) != expected {
				return errors.New("unexpected certificate")
			}
			return nil
		},
	}}}, nil
}

func health(cfg *config.Config) (map[string]any, error) {
	client, err := localClient(cfg)
	if err != nil {
		return nil, err
	}
	response, err := client.Get(fmt.Sprintf("https://127.0.0.1:%d/health", cfg.Port))
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		return nil, err
	}
	if body["id"] != cfg.ID {
		return nil, errors.New(i18n.T("other_server"))
	}
	return body, nil
}

func waitForHealth(cfg *config.Config, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var err error
	for time.Now().Before(deadline) {
		if _, err = health(cfg); err == nil {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return err
}

func doctor() error {
	ok := true
	check := func(label string, err error, detail string) {
		if err != nil {
			ok = false
			fmt.Printf("✗ %s: %v\n", label, err)
			return
		}
		fmt.Printf("✓ %s %s\n", label, detail)
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	bin, err := claude.Locate(cfg.ClaudeBin)
	check(i18n.T("doctor_claude"), err, bin)
	if err == nil {
		v, err := claude.Version(bin)
		check(i18n.T("doctor_version"), err, v)
	}
	sessions, err := transcripts.NewStore(transcripts.DefaultDir()).List()
	check(i18n.T("doctor_sessions"), err, i18n.T("doctor_sessions_in", len(sessions), transcripts.DefaultDir()))
	if !service.Installed() {
		check(i18n.T("doctor_service"), errors.New(i18n.T("doctor_no_service")), "")
	} else {
		_, err := health(cfg)
		check(i18n.T("doctor_service"), err, i18n.T("doctor_running", cfg.Port))
	}
	info, err := pairingInfo(cfg)
	check(i18n.T("doctor_hosts"), err, fmt.Sprint(info.Hosts))
	fmt.Println(i18n.T("doctor_config"), filepath.Dir(cfg.LogPath()))
	if !ok {
		return errors.New(i18n.T("doctor_failed"))
	}
	return nil
}
