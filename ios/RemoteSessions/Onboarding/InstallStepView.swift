import SwiftUI

/// One command per operating system; it installs the server, starts it in the background and prints the QR code.
enum InstallCommand: String, CaseIterable, Identifiable {
    case macOS, windows, linux

    var id: Self { self }

    var title: String {
        switch self {
        case .macOS: "macOS"
        case .windows: "Windows"
        case .linux: "Linux"
        }
    }

    var where_: LocalizedStringResource {
        switch self {
        case .macOS: "Open Terminal and paste:"
        case .windows: "Open PowerShell and paste:"
        case .linux: "Open a terminal and paste:"
        }
    }

    var command: String {
        switch self {
        case .macOS: "brew install antoniolg/tap/remote-sessions && remote-sessions setup"
        case .windows: "irm https://antonioleiva.com/remote-sessions/install.ps1 | iex"
        case .linux: "curl -fsSL https://antonioleiva.com/remote-sessions/install.sh | sh"
        }
    }

    var note: LocalizedStringResource? {
        switch self {
        case .macOS: "No Homebrew? This works too: \(InstallCommand.linux.command)"
        case .windows: "If Windows asks about the firewall, allow access on private networks."
        case .linux: nil
        }
    }
}

struct InstallStepView: View {
    let onNext: () -> Void
    @State private var system: InstallCommand = .macOS
    @State private var copied = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Install the server on your computer")
                    .font(.title.bold())
                Text("It's a small program that lets your phone see your conversations. It runs in the background and only answers the phones you pair.")
                    .foregroundStyle(.secondary)
                Picker("Operating system", selection: $system) {
                    ForEach(InstallCommand.allCases) { Text(verbatim: $0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                VStack(alignment: .leading, spacing: 10) {
                    Text(system.where_)
                        .font(.subheadline.weight(.semibold))
                    Text(verbatim: system.command)
                        .font(.system(.callout, design: .monospaced))
                        .textSelection(.enabled)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                    HStack {
                        Button(copied ? String(localized: "Copied") : String(localized: "Copy"), systemImage: copied ? "checkmark" : "doc.on.doc") {
                            UIPasteboard.general.string = system.command
                            copied = true
                        }
                        ShareLink(item: system.command, subject: Text("Install Remote Sessions"),
                                  message: Text("Paste this into your computer's terminal:")) {
                            Label("Send to computer", systemImage: "square.and.arrow.up")
                        }
                    }
                    .buttonStyle(.bordered)
                    if let note = system.note {
                        Text(note)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                    }
                }
                Label("When it finishes, the terminal will show a QR code.", systemImage: "qrcode")
                    .foregroundStyle(.secondary)
            }
            .padding(24)
        }
        .onChange(of: system) { copied = false }
        .safeAreaInset(edge: .bottom) {
            Button(action: onNext) {
                Text("I can see the QR code").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(24)
            .background(.bar)
        }
    }
}
