// Pairing: the same QR code as the store apps, read with the camera or pasted.

import { $, setError } from "./dom.js";
import { show } from "./nav.js";
import { startScanner, stopScanner } from "./scanner.js";
import { parsePairing, saveToken } from "./token.js";
import { showList } from "./sessions.js";

// The page belongs to one computer (its address): a code from another one would not work here.
async function pairWith(pairing) {
  setError("pair-error", null);
  const health = await fetch("/health", { cache: "no-store" }).then((response) => response.json());
  if (pairing.id && pairing.id !== health.id) {
    throw new Error(`That code is for ${pairing.name || "another computer"}, but this page is ${health.name}. Scan the code shown by ${health.name}.`);
  }
  saveToken(pairing.token);
  await showList();
}

function pair(pairing) {
  pairWith(pairing).catch((error) => {
    setError("pair-error", error.message);
    $("scan-start").hidden = false;
  });
}

function scan() {
  startScanner((text) => {
    const pairing = parsePairing(text);
    if (!pairing) return false;
    stopScanner();
    pair(pairing);
    return true;
  });
}

export function showPair(error) {
  show("pair");
  setError("pair-error", error);
  scan();
}

export function setUpPairing() {
  $("scan-start").onclick = scan;
  $("pair-save").onclick = () => {
    const pairing = parsePairing($("pair-input").value);
    if (!pairing) return setError("pair-error", "That is not a pairing link.");
    $("pair-input").value = "";
    pair(pairing);
  };
}
