// Renders the Google Play icon (512x512) and feature graphic (1024x500) from the app glyph vector.
// Usage: swift store/android/tools/render.swift <output-dir>
import AppKit
import CoreGraphics

let brand = CGColor(srgbRed: 0xD9 / 255, green: 0x77 / 255, blue: 0x57 / 255, alpha: 1)
let brandDark = CGColor(srgbRed: 0xB8 / 255, green: 0x5A / 255, blue: 0x3C / 255, alpha: 1)

// Glyph paths from android/app/src/main/res/drawable/ic_launcher_foreground.xml (1024 viewport).
let glyph: [(d: String, alpha: CGFloat, evenOdd: Bool)] = [
    ("M262,620 V357 A50,50 0 0 1 312,307 H710 A50,50 0 0 1 760,352 H664 A70,70 0 0 0 594,422 V620 Z M305,620 V364 A14,14 0 0 1 319,350 H664 A70,70 0 0 0 594,420 V620 Z", 1, true),
    ("M305,620 V364 A14,14 0 0 1 319,350 H664 A70,70 0 0 0 594,420 V620 Z", 0.4, false),
    ("M215,620 H594 V676 H215 A28,28 0 0 1 215,620 Z", 1, false),
    ("M667,385 H765 A45,45 0 0 1 810,430 V645 A45,45 0 0 1 765,690 H667 A45,45 0 0 1 622,645 V430 A45,45 0 0 1 667,385 Z M670,417 H762 A16,16 0 0 1 778,433 V642 A16,16 0 0 1 762,658 H670 A16,16 0 0 1 654,642 V433 A16,16 0 0 1 670,417 Z", 1, true),
    ("M670,417 H762 A16,16 0 0 1 778,433 V642 A16,16 0 0 1 762,658 H670 A16,16 0 0 1 654,642 V433 A16,16 0 0 1 670,417 Z", 0.4, false),
    ("M700,430 H734 A10,10 0 0 1 744,440 V440 A10,10 0 0 1 734,450 H700 A10,10 0 0 1 690,440 V440 A10,10 0 0 1 700,430 Z", 1, false),
    ("M687,628 H747 A7,7 0 0 1 754,635 V635 A7,7 0 0 1 747,642 H687 A7,7 0 0 1 680,635 V635 A7,7 0 0 1 687,628 Z", 1, false),
]
// Glyph bounds in the 1024 viewport.
let glyphBounds = CGRect(x: 187, y: 307, width: 623, height: 383)

/// Minimal SVG path parser: absolute M, H, V, A, Z (all the glyph uses).
func parsePath(_ d: String) -> CGPath {
    let path = CGMutablePath()
    var tokens: [String] = []
    var current = ""
    for ch in d {
        if ch.isLetter {
            if !current.isEmpty { tokens.append(current); current = "" }
            tokens.append(String(ch))
        } else if ch == "," || ch == " " {
            if !current.isEmpty { tokens.append(current); current = "" }
        } else { current.append(ch) }
    }
    if !current.isEmpty { tokens.append(current) }
    var i = 0
    var p = CGPoint.zero
    func num() -> CGFloat { defer { i += 1 }; return CGFloat(Double(tokens[i])!) }
    while i < tokens.count {
        let cmd = tokens[i]; i += 1
        switch cmd {
        case "M": p = CGPoint(x: num(), y: num()); path.move(to: p)
        case "H": p.x = num(); path.addLine(to: p)
        case "V": p.y = num(); path.addLine(to: p)
        case "Z": path.closeSubpath()
        case "A":
            let rx = num(); _ = num(); _ = num(); let large = num() != 0; let sweep = num() != 0
            let end = CGPoint(x: num(), y: num())
            addArc(path, from: p, to: end, r: rx, large: large, sweep: sweep)
            p = end
        default: fatalError("Unsupported command \(cmd)")
        }
    }
    return path
}

/// Circular SVG arc (endpoint parameterization) converted to a center arc.
func addArc(_ path: CGMutablePath, from p0: CGPoint, to p1: CGPoint, r: CGFloat, large: Bool, sweep: Bool) {
    if p0 == p1 { return }
    let mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2
    let dx = p1.x - p0.x, dy = p1.y - p0.y
    let chord = sqrt(dx * dx + dy * dy)
    let radius = max(r, chord / 2)
    let h = sqrt(max(0, radius * radius - chord * chord / 4))
    // Unit normal to the chord.
    let nx = -dy / chord, ny = dx / chord
    let sign: CGFloat = (large != sweep) ? 1 : -1
    let center = CGPoint(x: mx + sign * h * nx, y: my + sign * h * ny)
    let a0 = atan2(p0.y - center.y, p0.x - center.x)
    let a1 = atan2(p1.y - center.y, p1.x - center.x)
    // SVG sweep=1 means increasing angle in y-down space; CG's clockwise flag is in the same coordinate space.
    path.addArc(center: center, radius: radius, startAngle: a0, endAngle: a1, clockwise: !sweep)
}

func makeContext(_ w: Int, _ h: Int) -> CGContext {
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    // Flip to y-down so SVG coordinates map directly.
    ctx.translateBy(x: 0, y: CGFloat(h))
    ctx.scaleBy(x: 1, y: -1)
    return ctx
}

/// Draws the glyph so its viewport point `glyphBounds.origin` lands at `origin` with `scale`.
func drawGlyph(_ ctx: CGContext, origin: CGPoint, scale: CGFloat, viewportOrigin: CGPoint) {
    ctx.saveGState()
    ctx.translateBy(x: origin.x, y: origin.y)
    ctx.scaleBy(x: scale, y: scale)
    ctx.translateBy(x: -viewportOrigin.x, y: -viewportOrigin.y)
    for part in glyph {
        ctx.addPath(parsePath(part.d))
        ctx.setFillColor(CGColor(srgbRed: 1, green: 1, blue: 1, alpha: part.alpha))
        ctx.fillPath(using: part.evenOdd ? .evenOdd : .winding)
    }
    ctx.restoreGState()
}

func save(_ ctx: CGContext, _ url: URL, opaque: Bool) {
    var image = ctx.makeImage()!
    if opaque {
        // Re-draw into a context without alpha (Play rejects alpha in the feature graphic).
        let o = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 0,
                          space: CGColorSpace(name: CGColorSpace.sRGB)!,
                          bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        o.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        image = o.makeImage()!
    }
    let rep = NSBitmapImageRep(cgImage: image)
    try! rep.representation(using: .png, properties: [:])!.write(to: url)
    print("Wrote \(url.path)")
}

func drawText(_ ctx: CGContext, _ text: String, font: NSFont, color: NSColor, at point: CGPoint, kern: CGFloat = 0) {
    // `point` is the top-left in y-down coordinates.
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .kern: kern]
    let str = NSAttributedString(string: text, attributes: attrs)
    let size = str.size()
    ctx.saveGState()
    // Switch back to y-up for AppKit text drawing.
    ctx.scaleBy(x: 1, y: -1)
    ctx.translateBy(x: 0, y: -CGFloat(ctx.height))
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
    str.draw(at: CGPoint(x: point.x, y: CGFloat(ctx.height) - point.y - size.height))
    NSGraphicsContext.restoreGraphicsState()
    ctx.restoreGState()
}

func textSize(_ text: String, font: NSFont, kern: CGFloat = 0) -> CGSize {
    NSAttributedString(string: text, attributes: [.font: font, .kern: kern]).size()
}

let outDir = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".")

// MARK: Icon 512 (full-bleed square, glyph at the same scale as the iOS icon).
do {
    let size = 512
    let ctx = makeContext(size, size)
    ctx.setFillColor(brand)
    ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
    let s = CGFloat(size) / 1024
    drawGlyph(ctx, origin: .zero, scale: s, viewportOrigin: .zero)
    save(ctx, outDir.appendingPathComponent("icon-512.png"), opaque: false) // 32-bit RGBA, as Play asks
}

// MARK: Feature graphic 1024x500.
do {
    let w = 1024, h = 500
    let ctx = makeContext(w, h)
    let gradient = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
                              colors: [brandDark, brand] as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: CGFloat(h)), end: CGPoint(x: CGFloat(w), y: 0), options: [])

    let glyphWidth: CGFloat = 300
    let scale = glyphWidth / glyphBounds.width
    let glyphHeight = glyphBounds.height * scale
    let left: CGFloat = 80
    drawGlyph(ctx, origin: CGPoint(x: left, y: (CGFloat(h) - glyphHeight) / 2), scale: scale,
              viewportOrigin: glyphBounds.origin)

    let titleFont = NSFont.systemFont(ofSize: 64, weight: .bold)
    let taglineFont = NSFont.systemFont(ofSize: 34, weight: .medium)
    let title = "Remote Sessions"
    let tagline = "Your Claude Code sessions,\non your phone"
    let titleSize = textSize(title, font: titleFont, kern: -0.5)
    let taglineSize = textSize(tagline, font: taglineFont)
    let gap: CGFloat = 18
    let blockHeight = titleSize.height + gap + taglineSize.height
    let textX = left + glyphWidth + 60
    let top = (CGFloat(h) - blockHeight) / 2
    drawText(ctx, title, font: titleFont, color: .white, at: CGPoint(x: textX, y: top), kern: -0.5)
    drawText(ctx, tagline, font: taglineFont, color: NSColor.white.withAlphaComponent(0.9),
             at: CGPoint(x: textX, y: top + titleSize.height + gap))
    precondition(textX + max(titleSize.width, taglineSize.width) < CGFloat(w) - 40, "Text overflows")
    save(ctx, outDir.appendingPathComponent("feature-graphic.png"), opaque: true)
}
