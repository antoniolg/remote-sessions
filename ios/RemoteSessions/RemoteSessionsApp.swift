import SwiftUI

@main
struct RemoteSessionsApp: App {
    @State private var store: ComputerStore
    /// Kept apart from `store.needsOnboarding` so the last onboarding step shows after pairing.
    @State private var onboarding: Bool
    @State private var openedLink: PairingLinkBox?

    init() {
        let store = ComputerStore()
        _store = State(initialValue: store)
        _onboarding = State(initialValue: store.needsOnboarding)
        #if DEBUG
        // Lets UI checks pair the simulator: SIMCTL_CHILD_REMOTE_SESSIONS_PAIR=<link> xcrun simctl launch …
        if let text = ProcessInfo.processInfo.environment["REMOTE_SESSIONS_PAIR"], let link = PairingLink(text) {
            _openedLink = State(initialValue: PairingLinkBox(link: link))
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if onboarding {
                    OnboardingView { onboarding = false }
                } else {
                    SessionListView()
                }
            }
            .environment(store)
            .onChange(of: store.needsOnboarding) { _, needed in
                if needed { onboarding = true }
            }
            // Opening a remotesessions://pair link (from the camera app, Notes…) pairs that computer.
            .onOpenURL { url in
                if let link = PairingLink(url.absoluteString) { openedLink = PairingLinkBox(link: link) }
            }
            .sheet(item: $openedLink) { box in
                NavigationStack {
                    PairingCheckView(link: box.link) {
                        openedLink = nil
                        onboarding = false
                    }
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { openedLink = nil }
                        }
                    }
                }
                .environment(store)
            }
        }
    }
}

extension PairingLinkBox: Identifiable {}
