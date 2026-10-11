package pairing

import (
	"net"
	"net/url"
	"strings"
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

func TestURIEncodesSpacesAsPercent20(t *testing.T) {
	// iOS does not decode "+" in a query as a space.
	uri := Info{ID: "abc", Name: "Mac de Antonio", Port: 1, Hosts: []string{"h"}, Token: "t+k", Fingerprint: "ff"}.URI()
	if !strings.Contains(uri, "name=Mac%20de%20Antonio") || !strings.Contains(uri, "token=t%2Bk") {
		t.Fatalf("uri = %s", uri)
	}
}

func TestIsTailscale(t *testing.T) {
	for ip, want := range map[string]bool{"100.64.0.1": true, "100.127.255.1": true, "100.128.0.1": false, "192.168.1.2": false} {
		if got := isTailscale(net.ParseIP(ip)); got != want {
			t.Errorf("%s: got %v", ip, got)
		}
	}
}
