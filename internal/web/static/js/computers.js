// @ts-check
// The paired computers, like the store apps: each with its address and key, kept in this browser's localStorage.
// The page is served by one of them; the others are reached cross-origin (the server allows it, see docs/API.md).

const KEY = "remote-sessions.computers";
const CURRENT_KEY = "remote-sessions.current";
const LEGACY_TOKEN_KEY = "remote-sessions.token";
export const ALL = "all";

/**
 * A paired computer: where this browser reaches it and the key it accepts.
 * @typedef {{ id: string, name: string, origin: string, token: string }} Computer
 */
/**
 * What a pairing code says: the store apps' remotesessions://pair link, or a bare token.
 * @typedef {{ token: string, id?: string | null, name?: string | null, port?: string, hosts: string[] }} Pairing
 */
/** @typedef {{ ok: boolean, id: string, name: string, version: string }} Health */

/** @param {string} key */
function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** @param {string} key @param {string | null} value */
function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch { /* private mode: lasts this visit only */ }
}

/** @type {Computer[]} */
let computers = [];
try { computers = JSON.parse(read(KEY) || "[]") || []; } catch { computers = []; }
let current = read(CURRENT_KEY) || (computers[0] && computers[0].id) || null;

function persist() {
  write(KEY, JSON.stringify(computers));
  write(CURRENT_KEY, current);
}

export const list = () => computers;
/** @param {string | null} id */
export const byId = (id) => computers.find((computer) => computer.id === id) || null;

// The selected computer, or ALL for the merged list.
/** @returns {Computer | typeof ALL | null} */
export function selected() {
  if (current === ALL && computers.length > 1) return ALL;
  return byId(current) || computers[0] || null;
}

/** @param {string} id a computer id or ALL */
export function select(id) {
  current = id;
  persist();
}

/** @param {Computer} computer */
export function save(computer) {
  computers = computers.filter((other) => other.id !== computer.id);
  computers.push(computer);
  computers.sort((a, b) => a.name.localeCompare(b.name));
  current = computer.id;
  persist();
}

/** @param {string} id */
export function forget(id) {
  computers = computers.filter((computer) => computer.id !== id);
  if (current === id || computers.length < 2) current = (computers[0] && computers[0].id) || null;
  persist();
}

// URL-friendly computer name: "MacBook Pro de Alexander" -> "macbook-pro-de-alexander".
/** @param {string | null | undefined} name */
export const slug = (name) => (name || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * @param {string} origin
 * @param {number} [timeout] ms
 * @param {string} [token] another computer answers /health cross-origin only with its key
 * @returns {Promise<Health>}
 */
export async function healthAt(origin, timeout = 5000, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await fetch(`${origin}/health`, { cache: "no-store", headers, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// A reverse proxy in front of this page may route /<computer-slug>/ to another computer.
// Reached that way, every computer shares this page's address and certificate: no cross-origin
// calls and no certificate warning. See README, "One address for every computer".
/** @param {string | null | undefined} name */
export const proxiedOrigin = (name) => `${location.origin}/${slug(name)}`;

// Moves computers paired by their own address to this page's proxy when it now routes to them.
export async function preferProxy() {
  const away = computers.filter((computer) => computer.origin !== location.origin && !computer.origin.startsWith(`${location.origin}/`));
  const moved = await Promise.all(away.map(async (computer) => {
    const origin = proxiedOrigin(computer.name);
    const health = await healthAt(origin, 2000).catch(() => null);
    if (!health || health.id !== computer.id) return false;
    computer.origin = origin;
    return true;
  }));
  if (moved.some(Boolean)) persist();
}

// The first version kept a single key for the page's own computer: move it into the list.
export async function migrate() {
  const token = read(LEGACY_TOKEN_KEY);
  if (!token) return;
  try {
    const health = await fetch("/health", { cache: "no-store" }).then((response) => response.json());
    save({ id: health.id, name: health.name, origin: location.origin, token });
    write(LEGACY_TOKEN_KEY, null);
  } catch { /* the computer is away: try again next time */ }
}

// Reads the store apps' remotesessions://pair link (from the QR code or pasted) or a bare token.
/** @param {string} text @returns {Pairing | null} */
export function parsePairing(text) {
  text = text.trim();
  if (!text) return null;
  if (text.startsWith("remotesessions:")) {
    const params = new URLSearchParams(text.slice(text.indexOf("?") + 1));
    const token = params.get("token");
    if (!token) return null;
    return {
      token,
      id: params.get("id"),
      name: params.get("name"),
      port: params.get("port") || "8787",
      hosts: (params.get("hosts") || "").split(",").filter(Boolean),
    };
  }
  return /^[\w-]{16,}$/.test(text) ? { token: text, hosts: [] } : null;
}

// Where a pairing code's computer answers: this page's own computer, or one of the addresses in the code.
/** @param {Pairing} pairing */
export function candidateOrigins(pairing) {
  return pairing.hosts.map((host) => `https://${host.includes(":") ? `[${host}]` : host}:${pairing.port}`);
}
