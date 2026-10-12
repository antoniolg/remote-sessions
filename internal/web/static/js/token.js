// The key to the computer: kept in localStorage, which belongs to this page's origin (its address).

const TOKEN_KEY = "remote-sessions.token";

function stored() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

let current = stored();

export const token = () => current;

export function saveToken(value) {
  try { localStorage.setItem(TOKEN_KEY, value); } catch { /* private mode: lasts this visit only */ }
  current = value;
}

export function forgetToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing stored */ }
  current = null;
}

// Reads the store apps' remotesessions://pair link (from the QR code or pasted) or a bare token.
export function parsePairing(text) {
  text = text.trim();
  if (!text) return null;
  if (text.startsWith("remotesessions:")) {
    const params = new URLSearchParams(text.slice(text.indexOf("?") + 1));
    return params.get("token") ? { token: params.get("token"), id: params.get("id"), name: params.get("name") } : null;
  }
  return /^[\w-]{16,}$/.test(text) ? { token: text } : null;
}
