// @ts-check
// Reads QR codes with the camera: BarcodeDetector where the browser has it (Chrome), jsQR elsewhere (Safari).

import { t } from "./i18n.js";
import { $ } from "./dom.js";

/** @type {MediaStream | null} */
let stream = null;
// Bumped by every start and stop: a start still waiting for the camera gives up when it changes.
let generation = 0;

/** @returns {Promise<((video: HTMLVideoElement) => Promise<string | null | undefined>) | null>} */
async function qrReader() {
  if ("BarcodeDetector" in window) {
    const formats = await BarcodeDetector.getSupportedFormats().catch(() => /** @type {string[]} */ ([]));
    if (formats.includes("qr_code")) {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      return async (video) => (await detector.detect(video))[0]?.rawValue;
    }
  }
  // Decode the frames in JavaScript. Terminals often draw the code light on dark, hence both inversions.
  const jsQR = window.jsQR;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (jsQR && context) {
    return async (video) => {
      const size = Math.min(video.videoWidth, video.videoHeight, 720);
      if (!size) return null;
      const scale = size / Math.min(video.videoWidth, video.videoHeight);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data;
    };
  }
  return null;
}

// Scans until onCode accepts a code (returns true); the camera stops before onCode's work goes on.
/** @param {(text: string) => boolean} onCode */
export async function startScanner(onCode) {
  stopScanner();
  const mine = generation;
  const status = $("scan-status");
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = t("camera_unavailable");
    $("scan-start").hidden = true;
    return;
  }
  const read = await qrReader();
  if (mine !== generation) return;
  if (!read) {
    status.textContent = t("no_qr_reader");
    $("scan-start").hidden = true;
    return;
  }
  /** @type {MediaStream} */
  let camera;
  try {
    camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  } catch (caught) {
    if (mine !== generation) return;
    const error = /** @type {Error} */ (caught);
    status.textContent = error.name === "NotAllowedError"
      ? t("camera_denied")
      : t("no_camera", { reason: error.name });
    $("scan-start").hidden = false;
    return;
  }
  if (mine !== generation) {
    // Stopped (or restarted) while the browser was asking for the camera.
    camera.getTracks().forEach((track) => track.stop());
    return;
  }
  stream = camera;
  const video = $("scan-video");
  video.srcObject = stream;
  await video.play().catch(() => {});
  $("scanner").hidden = false;
  $("scan-start").hidden = true;
  status.textContent = t("point_camera");
  while (stream === camera) {
    const text = await read(video).catch(() => null);
    if (text) {
      if (onCode(text)) return;
      status.textContent = t("not_our_code");
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

export function stopScanner() {
  generation += 1;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  $("scanner").hidden = true;
  $("scan-status").textContent = "";
}
