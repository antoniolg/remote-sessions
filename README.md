# Remote Sessions

Use your Claude Code sessions from your phone. Remote Sessions lists every Claude Code conversation on your computer, shows its latest messages and, with one tap, resumes it with Claude Code's **Remote Control** so you can keep going from the Claude app.

It has two parts:

- **`remote-sessions`**, a small server that runs on the computer where you use Claude Code (macOS, Linux, Windows).
- **The Remote Sessions app** for iOS and Android.

> Remote Sessions is not an official Anthropic product. Claude and Claude Code are trademarks of Anthropic.

## Install the server

| System | Command |
| --- | --- |
| macOS | `brew install antoniolg/tap/remote-sessions && remote-sessions setup` |
| Linux / macOS without Homebrew | `curl -fsSL https://antonioleiva.com/remote-sessions/install.sh \| sh` |
| Windows (PowerShell) | `irm https://antonioleiva.com/remote-sessions/install.ps1 \| iex` |

`setup` installs a background service (LaunchAgent, systemd user unit or a logon task), starts it and prints a QR code. Scan it with the app.

Requirements: Claude Code logged in with a Claude subscription (Remote Control does not work with an API key).

### Commands

```
remote-sessions setup              Install the background service and show the QR code
remote-sessions pair [--rotate]    Show the QR code again (--rotate revokes every paired phone)
remote-sessions doctor             Check that everything is ready
remote-sessions serve [--log]      Run the server in the foreground
remote-sessions service install|uninstall|restart
```

## How it works

- The server reads the transcripts Claude Code keeps in `~/.claude/projects` and asks `claude agents --json` which sessions are open.
- "Connect" runs `claude --resume <id> --remote-control` in a pseudo-terminal owned by the server, waits until Remote Control publishes its session and returns the `claude.ai/code/session_…` URL, which the phone opens in the Claude app.
- Phones talk to the server over HTTPS on port 8787. The certificate is self-signed and **pinned**: the QR code carries its SHA-256 fingerprint and a random token, so only paired phones get in and nobody can impersonate the computer.
- The QR code lists the computer's LAN and Tailscale addresses. The server also announces itself over Bonjour (`_remotesessions._tcp`) so phones find it again if its address changes. To use it away from home, install [Tailscale](https://tailscale.com) on both devices.
- Nothing leaves your network: there is no account, cloud service or analytics.

The API is documented in [docs/API.md](docs/API.md). The install scripts live in `scripts/` and are served from `antonioleiva.com/remote-sessions/` (copy them to the blog repo, `public/remote-sessions/`, when they change).

## Development

```bash
go test ./...                       # server
go run ./cmd/remote-sessions serve  # run it from source
```

- iOS app: `ios/` (SwiftUI, generated with XcodeGen: `cd ios && xcodegen generate`). `ios/tools/testflight.sh upload` builds and uploads to TestFlight; it reads the App Store Connect API key ids from the untracked `ios/tools/asc.env`.
- Android app: `android/` (Kotlin, Jetpack Compose). See `android/README.md`.
- Releases: tag `vX.Y.Z` and run `~/.local/bin/oprun --with-op-token scripts/release.sh`; it signs the macOS binaries with the Developer ID certificate (1Password, Agent Runtime) and publishes to GitHub Releases and the Homebrew tap (`antoniolg/homebrew-tap`).

## License

MIT
