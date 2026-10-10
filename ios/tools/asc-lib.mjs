// Small App Store Connect API client. Reads ASC_KEY_ID and ASC_ISSUER_ID (see tools/asc.env)
// and the key from ~/.appstoreconnect/private_keys/AuthKey_<id>.p8.
import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const keyId = process.env.ASC_KEY_ID;
const issuer = process.env.ASC_ISSUER_ID;
if (!keyId || !issuer) throw new Error("Set ASC_KEY_ID and ASC_ISSUER_ID");
const key = createPrivateKey(readFileSync(`${homedir()}/.appstoreconnect/private_keys/AuthKey_${keyId}.p8`));

function token() {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "ES256", kid: keyId, typ: "JWT" })}.${b64({ iss: issuer, iat: now, exp: now + 900, aud: "appstoreconnect-v1" })}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${unsigned}.${signature}`;
}

/** Calls the API; throws with the API's error detail on failure. */
export async function api(path, method = "GET", body) {
  const url = path.startsWith("http") ? path : `https://api.appstoreconnect.apple.com/${path}`;
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token()}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try {
      detail = JSON.parse(text).errors.map((e) => `${e.title}: ${e.detail}`).join(" | ");
    } catch {}
    throw new Error(`${method} ${path} → ${response.status} ${detail}`);
  }
  return text ? JSON.parse(text) : null;
}

/** Uploads a file through the asset upload operations the API hands back. */
export async function uploadAsset(operations, data) {
  for (const op of operations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const chunk = data.subarray(op.offset, op.offset + op.length);
    const response = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!response.ok) throw new Error(`upload ${response.status} ${await response.text()}`);
  }
}

export const md5 = (data) => createHash("md5").update(data).digest("hex");
