import SwiftUI

/// First-run guide: what the app does, how to install the server, scanning its code and an optional Tailscale tip.
struct OnboardingView: View {
    enum Step: Hashable {
        case install, scan, check(PairingLinkBox), tailscale
    }

    var startAtInstall = false
    let onFinish: () -> Void
    @Environment(ComputerStore.self) private var store
    @State private var path: [Step] = []

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if startAtInstall {
                    InstallStepView { path.append(.scan) }
                } else {
                    welcome
                }
            }
            .toolbar {
                if startAtInstall {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancelar", action: onFinish)
                    }
                }
            }
            .navigationDestination(for: Step.self) { step in
                switch step {
                case .install:
                    InstallStepView { path.append(.scan) }
                case .scan:
                    ScanStepView { link in path.append(.check(PairingLinkBox(link: link))) }
                case .check(let box):
                    PairingCheckView(link: box.link) { path.append(.tailscale) }
                case .tailscale:
                    TailscaleStepView(onFinish: onFinish)
                }
            }
        }
    }

    private var welcome: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "laptopcomputer.and.iphone")
                .font(.system(size: 72))
                .foregroundStyle(.tint)
            VStack(spacing: 12) {
                Text("Remote Sessions")
                    .font(.largeTitle.bold())
                Text("Consulta tus conversaciones de Claude Code desde el móvil y continúa cualquiera con un toque.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            VStack(alignment: .leading, spacing: 14) {
                Requirement(icon: "terminal", text: "Claude Code instalado en tu ordenador")
                Requirement(icon: "person.crop.circle.badge.checkmark", text: "Una suscripción de Claude (Remote Control no funciona con API key)")
                Requirement(icon: "wifi", text: "El móvil en la misma wifi que el ordenador, o Tailscale")
            }
            .padding()
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
            Spacer()
            Button {
                path.append(.install)
            } label: {
                Text("Empezar").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            Button("Probar sin ordenador") {
                store.demoMode = true
                onFinish()
            }
        }
        .padding(24)
    }
}

/// PairingLink is not Hashable on purpose (it holds a token); navigation only needs identity.
struct PairingLinkBox: Hashable {
    let id = UUID()
    let link: PairingLink

    static func == (lhs: Self, rhs: Self) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

private struct Requirement: View {
    let icon: String
    let text: String

    var body: some View {
        Label {
            Text(text)
        } icon: {
            Image(systemName: icon).foregroundStyle(.tint)
        }
    }
}

struct TailscaleStepView: View {
    let onFinish: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.green)
            Text("¡Conectado!")
                .font(.largeTitle.bold())
            Text("Ya puedes ver tus conversaciones mientras estés en la misma wifi que el ordenador.")
            VStack(alignment: .leading, spacing: 8) {
                Label("¿Y fuera de casa?", systemImage: "globe")
                    .font(.headline)
                Text("Instala Tailscale en el ordenador y en el móvil con la misma cuenta. Después vuelve a ejecutar `remote-sessions pair` y escanea el código: incluirá la dirección de Tailscale.")
                    .foregroundStyle(.secondary)
                Link("Descargar Tailscale", destination: Links.tailscale)
            }
            .padding()
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
            Spacer()
            Button {
                onFinish()
            } label: {
                Text("Ver mis conversaciones").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(24)
        .navigationBarBackButtonHidden()
    }
}
