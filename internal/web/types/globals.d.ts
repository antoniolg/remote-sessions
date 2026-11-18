// Browser APIs the client feature-detects and that TypeScript's DOM library does not declare yet.

interface DetectedBarcode { rawValue: string }

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

// jsQR (static/jsqr.js) loads as a classic script and sets window.jsQR.
interface Window {
  jsQR?: (data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: string }) => { data: string } | null;
}
