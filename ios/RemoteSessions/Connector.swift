import SwiftUI

/// Asks the computer to resume a session with Remote Control and opens the resulting claude.ai URL.
/// Shared by the list and the detail so both show the same progress overlay and errors.
@MainActor
@Observable
final class Connector {
    private(set) var opening: Session?
    var errorMessage: String?
    /// Bumped after connecting or stopping, so screens refresh.
    private(set) var changes = 0
    private var task: Task<Void, Never>?

    func connect(_ session: Session, source: SessionSource?, openURL: OpenURLAction) {
        guard let source, opening == nil else { return }
        opening = session
        task = Task {
            defer {
                opening = nil
                changes += 1
            }
            do {
                openURL(try await source.connect(sessionID: session.id))
            } catch where error.isCancellation {
                // Cancelled from the overlay.
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func stop(_ session: Session, source: SessionSource?) async {
        guard let source else { return }
        do {
            try await source.disconnect(sessionID: session.id)
        } catch {
            errorMessage = error.localizedDescription
        }
        changes += 1
    }

    func cancel() {
        task?.cancel()
    }
}

extension Error {
    /// URLSession reports a cancelled task as URLError.cancelled, not CancellationError.
    var isCancellation: Bool {
        self is CancellationError || (self as? URLError)?.code == .cancelled
    }
}

/// Covers the screen while the computer starts Remote Control, and reports failures.
struct ConnectorPresentation: ViewModifier {
    @Bindable var connector: Connector

    func body(content: Content) -> some View {
        content
            .overlay {
                if let session = connector.opening {
                    OpeningOverlay(session: session) { connector.cancel() }
                }
            }
            .alert("Couldn't connect", isPresented: .constant(connector.errorMessage != nil)) {
                Button("OK") { connector.errorMessage = nil }
            } message: {
                Text(connector.errorMessage ?? "")
            }
    }
}

/// "Connect", or "Open" when the computer already runs the session with Remote Control.
struct ConnectButton: View {
    let session: Session
    var prominent = false
    @Environment(Connector.self) private var connector
    @Environment(ComputerStore.self) private var store
    @Environment(\.openURL) private var openURL

    var body: some View {
        let button = Button {
            if let url = session.remote?.url {
                openURL(url)
            } else {
                connector.connect(session, source: store.source, openURL: openURL)
            }
        } label: {
            if session.remote != nil {
                Label("Open", systemImage: "arrow.up.forward.app")
            } else {
                Label("Connect", systemImage: "antenna.radiowaves.left.and.right")
            }
        }
        .disabled(connector.opening != nil)
        if prominent {
            button.buttonStyle(.borderedProminent)
        } else {
            button.buttonStyle(.bordered).labelStyle(.iconOnly)
        }
    }
}

private struct OpeningOverlay: View {
    let session: Session
    let cancel: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Starting Remote Control…")
                .font(.headline)
            Text(session.displayTitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            Text("This can take up to a minute")
                .font(.caption)
                .foregroundStyle(.tertiary)
            Button("Cancel", role: .cancel, action: cancel)
                .padding(.top, 4)
        }
        .padding(24)
        .frame(maxWidth: 300)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black.opacity(0.2))
    }
}
