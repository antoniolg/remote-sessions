// Renders the 1024x1024 opaque app icon: an SF Symbol on Claude's orange. Usage: swift tools/make-icon.swift <out.png>
import AppKit

let size = 1024
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!,
                        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
context.setFillColor(CGColor(srgbRed: 0.85, green: 0.47, blue: 0.34, alpha: 1))
context.fill(CGRect(x: 0, y: 0, width: size, height: size))

let config = NSImage.SymbolConfiguration(pointSize: 300, weight: .medium)
let symbol = NSImage(systemSymbolName: "laptopcomputer.and.iphone", accessibilityDescription: nil)!
    .withSymbolConfiguration(config)!
let scale = 760 / max(symbol.size.width, symbol.size.height)
let rect = CGRect(x: (CGFloat(size) - symbol.size.width * scale) / 2, y: (CGFloat(size) - symbol.size.height * scale) / 2,
                  width: symbol.size.width * scale, height: symbol.size.height * scale)
var proposed = CGRect(origin: .zero, size: symbol.size)
let mask = symbol.cgImage(forProposedRect: &proposed, context: nil, hints: nil)!
context.clip(to: rect, mask: mask)
context.setFillColor(CGColor(gray: 1, alpha: 1))
context.fill(rect)

let rep = NSBitmapImageRep(cgImage: context.makeImage()!)
try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
