// Package discovery advertises the server on the local network (mDNS/Bonjour),
// so phones find it again when its LAN address changes.
package discovery

import (
	"github.com/libp2p/zeroconf/v2"
)

const Service = "_remotesessions._tcp"

// Advertise registers the service until the returned function is called.
func Advertise(id, name string, port int) (func(), error) {
	server, err := zeroconf.Register(name, Service, "local.", port, []string{"id=" + id, "v=1"}, nil)
	if err != nil {
		return func() {}, err
	}
	return server.Shutdown, nil
}
