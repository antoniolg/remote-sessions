// Package tailscale looks for an optional Tailscale install to offer the browser client an address
// with a trusted certificate (`tailscale serve`). Nothing depends on it: without Tailscale it finds nothing.
package tailscale

import (
	"context"
	"encoding/json"
	"net/url"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// macApp is the CLI inside the Mac app, which does not put `tailscale` on PATH by default.
const macApp = "/Applications/Tailscale.app/Contents/MacOS/Tailscale"

type Info struct {
	// DNSName is this computer's MagicDNS name (host.tailnet.ts.net), empty without MagicDNS.
	DNSName string
	// ServeURL is set when `tailscale serve` forwards HTTPS to this server.
	ServeURL string
}

func cli() string {
	if path, err := exec.LookPath("tailscale"); err == nil {
		return path
	}
	if _, err := exec.LookPath(macApp); err == nil {
		return macApp
	}
	return ""
}

func run(bin string, args ...string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return exec.CommandContext(ctx, bin, args...).Output()
}

// Detect reports whether Tailscale is running here and how it reaches the server on port.
func Detect(port int) (Info, bool) {
	bin := cli()
	if bin == "" {
		return Info{}, false
	}
	status, err := run(bin, "status", "--json")
	if err != nil {
		return Info{}, false
	}
	name, ok := parseStatus(status)
	if !ok {
		return Info{}, false
	}
	info := Info{DNSName: name}
	if name != "" {
		if serve, err := run(bin, "serve", "status", "--json"); err == nil {
			info.ServeURL = parseServe(serve, name, port)
		}
	}
	return info, true
}

// parseStatus returns the MagicDNS name of this machine when Tailscale is connected.
func parseStatus(data []byte) (string, bool) {
	var status struct {
		BackendState string
		Self         struct{ DNSName string }
	}
	if json.Unmarshal(data, &status) != nil || status.BackendState != "Running" {
		return "", false
	}
	return strings.TrimSuffix(status.Self.DNSName, "."), true
}

// parseServe finds a `tailscale serve` handler on name that proxies to this server's port.
func parseServe(data []byte, name string, port int) string {
	var config struct {
		Web map[string]struct {
			Handlers map[string]struct{ Proxy string }
		}
	}
	if json.Unmarshal(data, &config) != nil {
		return ""
	}
	for hostPort, web := range config.Web {
		host, servePort, _ := strings.Cut(hostPort, ":")
		if host != name {
			continue
		}
		handler, ok := web.Handlers["/"]
		if !ok || !proxiesTo(handler.Proxy, port) {
			continue
		}
		if servePort == "" || servePort == "443" {
			return "https://" + name + "/"
		}
		return "https://" + hostPort + "/"
	}
	return ""
}

func proxiesTo(proxy string, port int) bool {
	target, err := url.Parse(proxy)
	if err != nil {
		return false
	}
	switch target.Hostname() {
	case "localhost", "127.0.0.1", "::1":
		return target.Port() == strconv.Itoa(port)
	}
	return false
}
