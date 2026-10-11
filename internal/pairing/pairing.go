// Package pairing builds the code that phones scan to trust and reach this computer.
package pairing

import (
	"io"
	"net"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/mdp/qrterminal/v3"
)

type Info struct {
	ID          string
	Name        string
	Port        int
	Hosts       []string
	Token       string
	Fingerprint string
}

// URI is the remotesessions://pair link described in docs/API.md.
func (i Info) URI() string {
	query := url.Values{}
	query.Set("v", "1")
	query.Set("id", i.ID)
	query.Set("name", i.Name)
	query.Set("port", strconv.Itoa(i.Port))
	query.Set("hosts", strings.Join(i.Hosts, ","))
	query.Set("token", i.Token)
	query.Set("fp", i.Fingerprint)
	// Encode() writes spaces as "+", which iOS's URLComponents does not decode; "%20" works everywhere.
	return "remotesessions://pair?" + strings.ReplaceAll(query.Encode(), "+", "%20")
}

// PrintQR draws the pairing URI as a QR code for a terminal.
func (i Info) PrintQR(w io.Writer) {
	qrterminal.GenerateWithConfig(i.URI(), qrterminal.Config{
		Level:          qrterminal.L,
		Writer:         w,
		HalfBlocks:     true,
		BlackChar:      qrterminal.BLACK_BLACK,
		WhiteBlackChar: qrterminal.WHITE_BLACK,
		WhiteChar:      qrterminal.WHITE_WHITE,
		BlackWhiteChar: qrterminal.BLACK_WHITE,
		QuietZone:      1,
	})
}

// isTailscale reports whether ip is in Tailscale's CGNAT range 100.64.0.0/10.
func isTailscale(ip net.IP) bool {
	ip4 := ip.To4()
	return ip4 != nil && ip4[0] == 100 && ip4[1]&0xc0 == 64
}

// virtualPrefixes are interfaces of VMs and containers, unreachable from a phone.
var virtualPrefixes = []string{"bridge", "vmnet", "vboxnet", "docker", "br-", "veth", "virbr", "vEthernet", "lxc", "cni", "flannel", "awdl", "llw"}

func isVirtual(name string) bool {
	for _, prefix := range virtualPrefixes {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}

// Hosts lists the addresses phones should try: private LAN IPv4 first, then Tailscale.
func Hosts(extra []string) []string {
	var lan, tailnet []string
	interfaces, _ := net.Interfaces()
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := iface.Addrs()
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP.To4() == nil {
				continue
			}
			switch {
			case isTailscale(ipNet.IP):
				tailnet = append(tailnet, ipNet.IP.String())
			case ipNet.IP.IsPrivate() && !isVirtual(iface.Name):
				lan = append(lan, ipNet.IP.String())
			}
		}
	}
	sort.Strings(lan)
	sort.Strings(tailnet)
	return dedupe(append(append(append([]string{}, extra...), lan...), tailnet...))
}

func dedupe(values []string) []string {
	seen := map[string]bool{}
	out := values[:0]
	for _, value := range values {
		if value != "" && !seen[value] {
			seen[value] = true
			out = append(out, value)
		}
	}
	return out
}
