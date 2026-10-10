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

    var where_: String {
        switch self {
        case .macOS: "Abre Terminal y pega:"
        case .windows: "Abre PowerShell y pega:"
        case .linux: "Abre una terminal y pega:"
        }
    }

    var command: String {
        switch self {
        case .macOS: "brew install antoniolg/tap/remote-sessions && remote-sessions setup"
        case .windows: "irm https://antonioleiva.com/remote-sessions/install.ps1 | iex"
        case .linux: "curl -fsSL https://antonioleiva.com/remote-sessions/install.sh | sh"
        }
    }

    var note: String? {
        switch self {
        case .macOS: "¿Sin Homebrew? También vale: curl -fsSL https://antonioleiva.com/remote-sessions/install.sh | sh"
        case .windows: "Si Windows pregunta por el firewall, permite el acceso en redes privadas."
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
                Text("Instala el servidor en tu ordenador")
                    .font(.title.bold())
                Text("Es un programa pequeño que deja al móvil ver tus conversaciones. Se ejecuta en segundo plano y solo responde a los móviles que emparejes.")
                    .foregroundStyle(.secondary)
                Picker("Sistema", selection: $system) {
                    ForEach(InstallCommand.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                VStack(alignment: .leading, spacing: 10) {
                    Text(system.where_)
                        .font(.subheadline.weight(.semibold))
                    Text(system.command)
                        .font(.system(.callout, design: .monospaced))
                        .textSelection(.enabled)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                    HStack {
                        Button(copied ? "Copiado" : "Copiar", systemImage: copied ? "checkmark" : "doc.on.doc") {
                            UIPasteboard.general.string = system.command
                            copied = true
                        }
                        ShareLink(item: system.command, subject: Text("Instalar Remote Sessions"),
                                  message: Text("Pega esto en la terminal de tu ordenador:")) {
                            Label("Enviar al ordenador", systemImage: "square.and.arrow.up")
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
                Label("Al terminar, la terminal mostrará un código QR.", systemImage: "qrcode")
                    .foregroundStyle(.secondary)
            }
            .padding(24)
        }
        .onChange(of: system) { copied = false }
        .safeAreaInset(edge: .bottom) {
            Button(action: onNext) {
                Text("Ya veo el código QR").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(24)
            .background(.bar)
        }
    }
}
