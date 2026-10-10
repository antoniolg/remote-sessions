// Minimal App Store Connect API client using the team's API key. Usage: node tools/asc.mjs <path> [POST json-body]
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const keyId = process.env.ASC_KEY_ID;
const issuer = process.env.ASC_ISSUER_ID;
if (!keyId || !issuer) throw new Error("Set ASC_KEY_ID and ASC_ISSUER_ID");
const key = createPrivateKey(readFileSync(`${homedir()}/.appstoreconnect/private_keys/AuthKey_${keyId}.p8`));
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: "ES256", kid: keyId, typ: "JWT" })}.${b64({ iss: issuer, iat: now, exp: now + 600, aud: "appstoreconnect-v1" })}`;
const signature = sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
const response = await fetch(`https://api.appstoreconnect.apple.com/v1/${process.argv[2]}`, {
  method: process.argv[3] ?? "GET",
  headers: { authorization: `Bearer ${unsigned}.${signature}`, "content-type": "application/json" },
  body: process.argv[4],
});
console.log(response.status, await response.text());
