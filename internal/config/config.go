// Package config keeps the server identity: id, token, port and TLS certificate.
package config

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const DefaultPort = 8787

type Config struct {
	ID        string `json:"id"`
	Token     string `json:"token"`
	Port      int    `json:"port"`
	Name      string `json:"name,omitempty"`
	ClaudeBin string `json:"claudeBin,omitempty"`
	// Hosts overrides the addresses put in the pairing code (e.g. a Tailscale MagicDNS name).
	Hosts []string `json:"hosts,omitempty"`

	dir string
}

// Dir is the per-user config directory (~/Library/Application Support, ~/.config or %AppData%).
func Dir() (string, error) {
	if dir := os.Getenv("REMOTE_SESSIONS_CONFIG_DIR"); dir != "" {
		return dir, nil
	}
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "remote-sessions"), nil
}

func (c *Config) path() string     { return filepath.Join(c.dir, "config.json") }
func (c *Config) certPath() string { return filepath.Join(c.dir, "cert.pem") }
func (c *Config) keyPath() string  { return filepath.Join(c.dir, "key.pem") }

// LogPath is where the background service writes its output.
func (c *Config) LogPath() string { return filepath.Join(c.dir, "server.log") }

// Load reads the config, creating id, token and certificate on first use.
func Load() (*Config, error) {
	dir, err := Dir()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	c := &Config{dir: dir}
	if data, err := os.ReadFile(c.path()); err == nil {
		if err := json.Unmarshal(data, c); err != nil {
			return nil, fmt.Errorf("config.json is not valid: %w", err)
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	changed := false
	if c.ID == "" {
		c.ID = newUUID()
		changed = true
	}
	if c.Token == "" {
		c.Token = randomToken()
		changed = true
	}
	if c.Port == 0 {
		c.Port = DefaultPort
		changed = true
	}
	if changed {
		if err := c.Save(); err != nil {
			return nil, err
		}
	}
	return c, nil
}

func (c *Config) Save() error {
	data, _ := json.MarshalIndent(c, "", "  ")
	return os.WriteFile(c.path(), append(data, '\n'), 0o600)
}

// ComputerName is shown in the apps.
func (c *Config) ComputerName() string {
	if c.Name != "" {
		return c.Name
	}
	name, _ := os.Hostname()
	return strings.TrimSuffix(name, ".local")
}

// RotateToken invalidates every paired phone.
func (c *Config) RotateToken() error {
	c.Token = randomToken()
	return c.Save()
}

// Certificate loads the TLS certificate, creating a self-signed one on first use.
func (c *Config) Certificate() (tls.Certificate, error) {
	if _, err := os.Stat(c.certPath()); errors.Is(err, os.ErrNotExist) {
		if err := c.generateCertificate(); err != nil {
			return tls.Certificate{}, err
		}
	}
	return tls.LoadX509KeyPair(c.certPath(), c.keyPath())
}

// Fingerprint is the lowercase hex SHA-256 of the certificate DER; apps pin it.
func Fingerprint(cert tls.Certificate) string {
	sum := sha256.Sum256(cert.Certificate[0])
	return hex.EncodeToString(sum[:])
}

func (c *Config) generateCertificate() error {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return err
	}
	serial, _ := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 120))
	template := x509.Certificate{
		SerialNumber: serial,
		Subject:      pkix.Name{CommonName: "Remote Sessions " + c.ComputerName()},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().AddDate(20, 0, 0),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		DNSNames:     []string{"remote-sessions.local"},
	}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		return err
	}
	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return err
	}
	if err := os.WriteFile(c.keyPath(), pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER}), 0o600); err != nil {
		return err
	}
	return os.WriteFile(c.certPath(), pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), 0o644)
}

func randomToken() string {
	buf := make([]byte, 24)
	_, _ = rand.Read(buf)
	return base64.RawURLEncoding.EncodeToString(buf)
}

func newUUID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	buf[6] = buf[6]&0x0f | 0x40
	buf[8] = buf[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:])
}
