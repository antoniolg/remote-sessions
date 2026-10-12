import SwiftUI

@main
struct RemoteSessionsApp: App {
    @State private var store: ComputerStore
    /// Kept apart from `store.needsOnboarding` so the last onboarding step shows after pairing.
    @State private var onboarding: Bool
    @State private var openedLink: PairingLinkBox?
    @State private var onboardingAtInstall = false

    init() {
        let store = ComputerStore()
        _store = State(initialValue: store)
        _onboarding = State(initialValue: store.needsOnboarding)
        #if DEBUG
        // Lets UI checks pair the simulator: SIMCTL_CHILD_REMOTE_SESSIONS_PAIR=<link> xcrun simctl launch …
        let environment = ProcessInfo.processInfo.environment
        if let text = environment["REMOTE_SESSIONS_PAIR"], let link = PairingLink(text) {
            _openedLink = State(initialValue: PairingLinkBox(link: link))
        }
        // Store screenshots: REMOTE_SESSIONS_SCREEN=list|detail shows the demo, welcome|install the onboarding;
        // video shows the demo for the launch video (DemoSource.video).
        switch environment["REMOTE_SESSIONS_SCREEN"] {
        case "list", "detail", "video":
            store.demoMode = true
            _onboarding = State(initialValue: false)
        case "welcome", "install":
            store.demoMode = false
            _onboarding = State(initialValue: true)
            _onboardingAtInstall = State(initialValue: environment["REMOTE_SESSIONS_SCREEN"] == "install")
        default:
            break
        }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if onboarding {
                    OnboardingView(initialPath: onboardingAtInstall ? [.install] : []) { onboarding = false }
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
