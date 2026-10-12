package tailscale

import "testing"

func TestParseStatus(t *testing.T) {
	name, ok := parseStatus([]byte(`{"BackendState":"Running","Self":{"DNSName":"mac.tail1234.ts.net."}}`))
	if !ok || name != "mac.tail1234.ts.net" {
		t.Fatalf("%q %v", name, ok)
	}
	if _, ok := parseStatus([]byte(`{"BackendState":"Stopped","Self":{"DNSName":"mac.tail1234.ts.net."}}`)); ok {
		t.Fatal("stopped Tailscale reported as running")
	}
	if _, ok := parseStatus([]byte(`not json`)); ok {
		t.Fatal("garbage reported as running")
	}
}

func TestParseServe(t *testing.T) {
	const name = "mac.tail1234.ts.net"
	cases := []struct {
		json string
		want string
	}{
		{`{"Web":{"mac.tail1234.ts.net:443":{"Handlers":{"/":{"Proxy":"https+insecure://localhost:8787"}}}}}`, "https://mac.tail1234.ts.net/"},
		{`{"Web":{"mac.tail1234.ts.net:8443":{"Handlers":{"/":{"Proxy":"https+insecure://127.0.0.1:8787"}}}}}`, "https://mac.tail1234.ts.net:8443/"},
		{`{"Web":{"mac.tail1234.ts.net:443":{"Handlers":{"/":{"Proxy":"http://localhost:3000"}}}}}`, ""},
		{`{"Web":{"other.tail1234.ts.net:443":{"Handlers":{"/":{"Proxy":"https+insecure://localhost:8787"}}}}}`, ""},
		{`{"Web":{"mac.tail1234.ts.net:443":{"Handlers":{"/docs":{"Proxy":"https+insecure://localhost:8787"}}}}}`, ""},
		{`{}`, ""},
	}
	for _, c := range cases {
		if got := parseServe([]byte(c.json), name, 8787); got != c.want {
			t.Errorf("%s: got %q, want %q", c.json, got, c.want)
		}
	}
}
