import SwiftUI

/// Something that ends in a Remote Control URL: resuming a conversation or starting a new one.
struct Launch {
    let title: String
    let start: @MainActor (_ trustFolder: Bool) async throws -> URL
}

/// Asks the computer to resume or start a session with Remote Control and opens the resulting claude.ai URL.
/// Shared by the list and the detail so both show the same progress overlay and errors.
@MainActor
@Observable
final class Connector {
    private(set) var opening: Launch?
    var errorMessage: String?
    /// A disconnected conversation (open on the computer without Remote Control) waiting for the
    /// user to confirm its relaunch as a copy.
    var openOnComputer: Session?
    private(set) var relaunchSource: SessionSource?
    private(set) var lastOpenURL: OpenURLAction?

    func askToRelaunch(_ session: Session, source: SessionSource?, openURL: OpenURLAction) {
        relaunchSource = source
        lastOpenURL = openURL
        openOnComputer = session
    }
    /// A launch waiting for the user to trust its folder.
    var pendingTrust: (launch: Launch, folder: String)?
    private var openURL: OpenURLAction?
    /// Bumped after connecting or stopping, so screens refresh.
    private(set) var changes = 0
    private var task: Task<Void, Never>?

    func connect(_ session: Session, source: SessionSource?, openURL: OpenURLAction) {
        guard let source else { return }
        run(Launch(title: session.displayTitle) { trust in
            try await source.connect(sessionID: session.id, trustFolder: trust, fork: false)
        }, openURL: openURL)
    }

    /// Continues a conversation that is open on the computer without Remote Control in a copy with it.
    func relaunch(_ session: Session, source: SessionSource?, openURL: OpenURLAction) {
        guard let source else { return }
        run(Launch(title: session.displayTitle) { trust in
            try await source.connect(sessionID: session.id, trustFolder: trust, fork: true)
        }, openURL: openURL)
    }

    /// Starts a new conversation in a folder of the computer.
    func create(in folder: String, title: String?, source: SessionSource?, openURL: OpenURLAction) {
        guard let source else { return }
        let name = title ?? (folder as NSString).lastPathComponent
        run(Launch(title: String(localized: "New conversation in \(name)")) { trust in
            try await source.create(cwd: folder, title: title, trustFolder: trust)
        }, openURL: openURL)
    }

    private func run(_ launch: Launch, openURL: OpenURLAction, trustFolder: Bool = false) {
        guard opening == nil else { return }
        self.openURL = openURL
        opening = launch
        task = Task {
            defer {
                opening = nil
                changes += 1
            }
            do {
                openURL(try await launch.start(trustFolder))
            } catch where error.isCancellation {
                // Cancelled from the overlay.
            } catch SourceError.trustRequired(let folder) {
                pendingTrust = (launch, folder)
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

    /// The user trusts the folder: connect again answering yes.
    func trustAndConnect() {
        guard let pending = pendingTrust, let openURL else { return }
        pendingTrust = nil
        run(pending.launch, openURL: openURL, trustFolder: true)
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
                if let launch = connector.opening {
                    OpeningOverlay(title: launch.title) { connector.cancel() }
                }
            }
            .alert("Trust this folder?", isPresented: .constant(connector.pendingTrust != nil)) {
                Button("Trust and connect") { connector.trustAndConnect() }
                Button("Cancel", role: .cancel) { connector.pendingTrust = nil }
            } message: {
                if let folder = connector.pendingTrust?.folder {
                    Text("Claude Code will be able to read, edit and run files in \(folder). Trust it only if it's your own project.")
                }
            }
            .alert("Relaunch this conversation?", isPresented: .constant(connector.openOnComputer != nil)) {
                Button("Relaunch") {
                    if let session = connector.openOnComputer, let openURL = connector.lastOpenURL {
                        connector.relaunch(session, source: connector.relaunchSource, openURL: openURL)
                    }
                    connector.openOnComputer = nil
                }
                Button("Cancel", role: .cancel) { connector.openOnComputer = nil }
            } message: {
                Text("It's still open on the computer, but its Remote Control is disconnected, so you can't reach it from claude.ai. Relaunching opens a copy with the whole conversation and Remote Control; the original stays on the computer.")
            }
            .alert("Couldn't connect", isPresented: .constant(connector.errorMessage != nil)) {
                Button("OK") { connector.errorMessage = nil }
            } message: {
                Text(connector.errorMessage ?? "")
            }
    }
}

/// "Connect", "Open" when the session already has Remote Control, or an explanation when it is open on the computer.
struct ConnectButton: View {
    let session: Session
    var prominent = false
    @Environment(Connector.self) private var connector
    @Environment(ComputerStore.self) private var store
    @Environment(\.openURL) private var openURL

    var body: some View {
        let button = Button {
            switch session.availability {
            case .remoteControl:
                if let url = session.remote?.url { openURL(url) }
            case .openOnComputer:
                connector.askToRelaunch(session, source: store.source, openURL: openURL)
            case .closed:
                connector.connect(session, source: store.source, openURL: openURL)
            }
        } label: {
            switch session.availability {
            case .remoteControl: Label("Open", systemImage: "arrow.up.forward.app")
            case .openOnComputer: Label("Relaunch", systemImage: "arrow.triangle.branch")
            case .closed: Label("Connect", systemImage: "antenna.radiowaves.left.and.right")
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
    let title: String
    let cancel: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Starting Remote Control…")
                .font(.headline)
            Text(title)
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

/// Says what state a conversation is in, next to the time in the list and in the detail.
struct AvailabilityLabel: View {
    let session: Session

    var body: some View {
        switch session.availability {
        case .remoteControl:
            Label("Remote Control", systemImage: "antenna.radiowaves.left.and.right")
                .foregroundStyle(.green)
        case .openOnComputer:
            Label("Disconnected", systemImage: "bolt.horizontal.circle")
                .foregroundStyle(.orange)
        case .closed:
            EmptyView()
        }
    }
}
