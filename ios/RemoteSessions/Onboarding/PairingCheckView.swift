import SwiftUI

/// Connects to a scanned computer before saving it, so a wrong network shows up now and not later.
struct PairingCheckView: View {
    let link: PairingLink
    let onPaired: () -> Void
    @Environment(ComputerStore.self) private var store
    @State private var error: String?
    @State private var attempt = 0

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            if let error {
                Image(systemName: "wifi.exclamationmark")
                    .font(.system(size: 56))
                    .foregroundStyle(.orange)
                Text("No se pudo conectar con \(link.computer.name)")
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
                Text(error)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button("Reintentar") { attempt += 1 }
                    .buttonStyle(.borderedProminent)
            } else {
                ProgressView()
                    .controlSize(.large)
                Text("Conectando con \(link.computer.name)…")
                    .font(.headline)
            }
            Spacer()
        }
        .padding(24)
        .task(id: attempt) { await check() }
    }

    private func check() async {
        error = nil
        let reached = ReachedHost()
        let client = APIClient(computer: link.computer, token: link.token) { host in reached.host = host }
        do {
            let health = try await client.health()
            guard health.id == link.computer.id else {
                error = "En esa dirección responde otro ordenador. Vuelve a escanear el código."
                return
            }
            _ = try await client.sessions()
            var computer = link.computer
            computer.lastHost = reached.host
            store.add(PairingLink(computer: computer, token: link.token))
            onPaired()
        } catch where error.isCancellation {
            // Left the screen.
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// The host that answered while checking, to try it first next time.
@MainActor
private final class ReachedHost {
    var host: String?
}

extension PairingLink {
    init(computer: Computer, token: String) {
        self.computer = computer
        self.token = token
    }
}
