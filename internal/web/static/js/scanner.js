// Reads QR codes with the camera: BarcodeDetector where the browser has it (Chrome), jsQR elsewhere (Safari).

import { $ } from "./dom.js";

let stream = null;

async function qrReader() {
  if ("BarcodeDetector" in window) {
    const formats = await BarcodeDetector.getSupportedFormats().catch(() => []);
    if (formats.includes("qr_code")) {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      return async (video) => (await detector.detect(video))[0]?.rawValue;
    }
  }
  // Decode the frames in JavaScript. Terminals often draw the code light on dark, hence both inversions.
  if (window.jsQR) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    return async (video) => {
      const size = Math.min(video.videoWidth, video.videoHeight, 720);
      if (!size) return null;
      const scale = size / Math.min(video.videoWidth, video.videoHeight);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      return window.jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data;
    };
  }
  return null;
}

// Scans until onCode accepts a code (returns true); the camera stops before onCode's work goes on.
export async function startScanner(onCode) {
  stopScanner();
  const status = $("scan-status");
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = "This browser does not give pages the camera here. Paste the link below.";
    $("scan-start").hidden = true;
    return;
  }
  const read = await qrReader();
  if (!read) {
    status.textContent = "This browser cannot read QR codes. Paste the link below.";
    $("scan-start").hidden = true;
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  } catch (error) {
    status.textContent = error.name === "NotAllowedError"
      ? "The camera was not allowed. Allow it in the browser's settings and try again, or paste the link below."
      : `No camera available (${error.name}). Paste the link below.`;
    $("scan-start").hidden = false;
    return;
  }
  const video = $("scan-video");
  video.srcObject = stream;
  await video.play().catch(() => {});
  $("scanner").hidden = false;
  $("scan-start").hidden = true;
  status.textContent = "Point the camera at the code.";
  const mine = stream;
  while (stream === mine) {
    const text = await read(video).catch(() => null);
    if (text) {
      if (onCode(text)) return;
      status.textContent = "That QR code is not a Remote Sessions code.";
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

export function stopScanner() {
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  $("scanner").hidden = true;
  $("scan-status").textContent = "";
}
