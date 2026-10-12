// What the browser lets this page do as a PWA: the point of the prototype.

import { $, el } from "./dom.js";

const state = { serviceWorker: "not tried", installPrompt: false };

export function registerServiceWorker() {
  window.addEventListener("beforeinstallprompt", () => { state.installPrompt = true; });
  if (!("serviceWorker" in navigator)) {
    state.serviceWorker = window.isSecureContext ? "unsupported" : "unavailable (not a secure context)";
    return;
  }
  navigator.serviceWorker.register("sw.js", { scope: "/app/" })
    .then(() => { state.serviceWorker = "registered"; })
    // Chrome refuses it with a self-signed certificate (SecurityError); Safari accepts it once the warning is accepted.
    .catch((error) => { state.serviceWorker = `refused: ${error.name}: ${error.message}`; });
}

export async function showDiagnostics() {
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let storage = "no";
  try { localStorage.setItem("probe", "1"); localStorage.removeItem("probe"); storage = "yes"; } catch { /* blocked */ }
  let persisted = "unsupported";
  if (navigator.storage && navigator.storage.persisted) persisted = (await navigator.storage.persisted()) ? "yes" : "no (may be evicted)";
  const rows = [
    ["Secure context (needed by service workers)", window.isSecureContext ? "yes" : "no"],
    ["Service worker", state.serviceWorker],
    ["Running installed (standalone)", standalone ? "yes" : "no, in the browser"],
    ["Install prompt offered (Chrome)", state.installPrompt ? "yes" : "no"],
    ["localStorage", storage],
    ["Persistent storage", persisted],
    ["Push notifications", "PushManager" in window ? "API present" : "no"],
    ["QR scanning in page (BarcodeDetector)", "BarcodeDetector" in window ? "yes" : "no"],
    ["Camera (getUserMedia)", navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? "yes" : "no"],
    ["Web Share", navigator.share ? "yes" : "no"],
  ];
  $("diag-table").replaceChildren(...rows.map(([name, value]) => {
    const row = el("tr");
    row.append(el("td", null, name), el("td", null, value));
    return row;
  }));
  $("diag-origin").textContent = location.origin;
  $("diag").showModal();
}
