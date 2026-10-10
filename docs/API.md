# Remote Sessions API (v1)

The `remote-sessions` server runs on the computer where Claude Code is used. Mobile apps talk to it over HTTPS.

## Transport and trust
- HTTPS on port `8787` (configurable), listening on every interface.
- The certificate is self-signed (ECDSA P-256). Apps **pin it**: they accept the connection only when the SHA-256 of the leaf certificate (DER) equals the `fp` received when pairing, and ignore hostname and chain validation.
- Every endpoint except `/health` needs `Authorization: Bearer <token>`.

## Pairing
`remote-sessions pair` prints a QR code with this URI (also usable as a link):

```
remotesessions://pair?v=1&id=<serverId>&name=<computer name>&port=8787&hosts=<host1>,<host2>&token=<token>&fp=<sha256 hex>
```

- `id`: stable server id (UUID). Apps store one computer per `id`; pairing again replaces it.
- `hosts`: addresses to try, in order (LAN IPs, Tailscale IP, hostname). Apps try each and remember the last one that worked.
- `fp`: lowercase hex SHA-256 of the certificate DER, no separators.

## Discovery (optional)
The server advertises `_remotesessions._tcp` over mDNS/Bonjour with TXT records `id=<serverId>` and `v=1`. When the stored hosts fail, apps can browse for a service with the same `id` and use its address. Trust still comes from the pinned fingerprint.

## Endpoints
All responses are JSON. Errors: non-2xx status with `{"code": "<code>", "error": "<English message>"}`. Apps show a translated message per `code` and fall back to `error`:

| code | meaning |
| --- | --- |
| `unauthorized` | wrong or missing token: pair again |
| `not_found` | unknown conversation, or not run by this server (DELETE) |
| `open_elsewhere` | the conversation is open on the computer (terminal or desktop app) |
| `remote_control_timeout` | Remote Control did not publish its URL in time (is Claude Code logged in with a subscription?) |
| `launch_failed` | Claude Code could not resume the conversation |
| `internal` | anything else |

### `GET /health` (no auth)
```json
{ "ok": true, "id": "…", "name": "antonio-pro-m5", "version": "0.1.0" }
```

### `GET /v1/sessions`
```json
{ "sessions": [ {
  "id": "7663883c-084e-4f27-83a2-0f2ff3ef5fdc",
  "title": "Temas para charla GitHub Copilot",
  "lastPrompt": "es un poco arriesgado esto…",
  "cwd": "/Users/antonio/Documents/DevExpert/Contenido",
  "project": "Contenido",
  "updatedAt": "2026-10-09T16:57:33.296Z",
  "running": { "kind": "interactive", "status": "busy" },
  "remote": { "url": "https://claude.ai/code/session_01…" }
} ] }
```
- Sorted by `updatedAt`, newest first.
- `running` is `null` when the session is not open on the computer. `kind`: `interactive`, `background` or `remote-sessions` (started by this server).
- `remote` is `null` unless this server currently runs the session with Remote Control.

### `GET /v1/sessions/{id}/messages?limit=60`
Latest messages (max 200), oldest first:
```json
{ "messages": [
  { "id": "…", "role": "user", "text": "Arregla el login", "tools": [], "timestamp": "2026-10-09T16:50:00.000Z" },
  { "id": "…", "role": "assistant", "text": "Hecho.", "tools": ["Read", "Edit"], "timestamp": "…" }
] }
```
`text` is Markdown, cut at 4000 characters. `tools` lists the tool names Claude used in that reply.

### `POST /v1/sessions/{id}/remote-control`
Resumes the session in a pseudo-terminal with Remote Control and waits (up to ~45 s) for its claude.ai URL.
```json
{ "url": "https://claude.ai/code/session_01…", "reused": false }
```
- `reused: true` when this server already had it running.
- `409 open_elsewhere` when the session is open elsewhere on the computer (terminal or desktop app).
- `504 remote_control_timeout` when Remote Control did not come up in time.
- `502 launch_failed` when Claude Code exited or could not start.

Apps open `url`; the Claude app handles it as a universal/app link.

### `DELETE /v1/sessions/{id}/remote-control`
Stops a session this server started. `204` on success, `404` if it was not running here.
