import SwiftUI
import VisionKit

struct ScanStepView: View {
    let onLink: (PairingLink) -> Void
    @State private var pasted = ""
    @State private var invalid = false

    var body: some View {
        VStack(spacing: 20) {
            Text("Scan the QR code shown in the terminal")
                .font(.title2.bold())
                .multilineTextAlignment(.center)
            if QRScanner.isAvailable {
                QRScanner { text in
                    if let link = PairingLink(text) { onLink(link) } else { invalid = true }
                }
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .frame(maxHeight: 360)
            } else {
                ContentUnavailableView("Camera unavailable", systemImage: "camera",
                                       description: Text("Paste the link that appears below the code."))
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("Can't scan it? Paste the remotesessions://… link or show it again with `remote-sessions pair`.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                HStack {
                    TextField(text: $pasted, prompt: Text(verbatim: "remotesessions://pair?…")) { Text("Pairing link") }
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                    Button("Use") {
                        if let link = PairingLink(pasted) { onLink(link) } else { invalid = true }
                    }
                    .disabled(pasted.isEmpty)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(24)
        .alert("That's not a Remote Sessions code", isPresented: $invalid) {
            Button("OK") {}
        } message: {
            Text("Scan the code shown by `remote-sessions setup` or `remote-sessions pair`.")
        }
    }
}

/// VisionKit's live QR scanner.
struct QRScanner: UIViewControllerRepresentable {
    let onCode: (String) -> Void

    @MainActor static var isAvailable: Bool {
        DataScannerViewController.isSupported && DataScannerViewController.isAvailable
    }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(recognizedDataTypes: [.barcode(symbologies: [.qr])],
                                                qualityLevel: .balanced, isHighlightingEnabled: true)
        scanner.delegate = context.coordinator
        try? scanner.startScanning()
        return scanner
    }

    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {}

    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        controller.stopScanning()
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onCode: onCode)
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onCode: (String) -> Void
        private var handled = false

        init(onCode: @escaping (String) -> Void) {
            self.onCode = onCode
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !handled else { return }
            for case .barcode(let barcode) in addedItems {
                if let text = barcode.payloadStringValue {
                    handled = PairingLink(text) != nil
                    onCode(text)
                    return
                }
            }
        }
    }
}
