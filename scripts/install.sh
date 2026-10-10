#!/bin/sh
# Installs remote-sessions on Linux or macOS and starts it: curl -fsSL https://antonioleiva.com/remote-sessions/install.sh | sh
set -eu

REPO="antoniolg/remote-sessions"
BIN_DIR="${REMOTE_SESSIONS_BIN_DIR:-$HOME/.local/bin}"

case "$(uname -s)" in
  Linux) os=linux ;;
  Darwin) os=darwin ;;
  *) echo "Unsupported system: $(uname -s). On Windows use install.ps1." >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=amd64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

url="https://github.com/$REPO/releases/latest/download/remote-sessions_${os}_${arch}.tar.gz"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading remote-sessions ($os/$arch)…"
curl -fsSL "$url" -o "$tmp/remote-sessions.tar.gz"
tar -xzf "$tmp/remote-sessions.tar.gz" -C "$tmp"
mkdir -p "$BIN_DIR"
install -m 0755 "$tmp/remote-sessions" "$BIN_DIR/remote-sessions"
echo "Installed in $BIN_DIR/remote-sessions"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "Add $BIN_DIR to your PATH to use the remote-sessions command." ;;
esac

"$BIN_DIR/remote-sessions" setup
