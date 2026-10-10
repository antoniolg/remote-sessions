package pairing

import (
	"net"
	"net/url"
	"testing"
)

func TestURIRoundTrip(t *testing.T) {
	info := Info{ID: "abc", Name: "Mac de Antonio", Port: 8787, Hosts: []string{"192.168.1.10", "100.100.1.2"}, Token: "t+k/n", Fingerprint: "ff00"}
	parsed, err := url.Parse(info.URI())
	if err != nil {
		t.Fatal(err)
	}
	q := parsed.Query()
	if parsed.Scheme != "remotesessions" || parsed.Host != "pair" {
		t.Fatalf("unexpected uri %s", info.URI())
	}
	if q.Get("v") != "1" || q.Get("id") != "abc" || q.Get("name") != "Mac de Antonio" || q.Get("port") != "8787" ||
		q.Get("hosts") != "192.168.1.10,100.100.1.2" || q.Get("token") != "t+k/n" || q.Get("fp") != "ff00" {
		t.Fatalf("unexpected query %v", q)
	}
}

func TestIsTailscale(t *testing.T) {
	for ip, want := range map[string]bool{"100.64.0.1": true, "100.127.255.1": true, "100.128.0.1": false, "192.168.1.2": false} {
		if got := isTailscale(net.ParseIP(ip)); got != want {
			t.Errorf("%s: got %v", ip, got)
		}
	}
}
