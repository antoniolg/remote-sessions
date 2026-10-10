import SwiftUI

/// First-run guide: what the app does, how to install the server, scanning its code and an optional Tailscale tip.
struct OnboardingView: View {
    enum Step: Hashable {
        case install, scan, check(PairingLinkBox), tailscale
    }

    var startAtInstall = false
    /// Steps to open on top of the welcome screen (store screenshots).
    var initialPath: [Step] = []
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
                        Button("Cancel", action: onFinish)
                    }
                }
            }
            .onAppear { if path.isEmpty { path = initialPath } }
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
                Text(verbatim: "Remote Sessions")
                    .font(.largeTitle.bold())
                Text("View your Claude Code conversations from your phone and continue any of them with a tap.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            VStack(alignment: .leading, spacing: 14) {
                Requirement(icon: "terminal", text: "Claude Code installed on your computer")
                Requirement(icon: "person.crop.circle.badge.checkmark", text: "A Claude subscription (Remote Control doesn't work with an API key)")
                Requirement(icon: "wifi", text: "Your phone on the same Wi-Fi as your computer, or Tailscale")
            }
            .padding()
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
            Spacer()
            Button {
                path.append(.install)
            } label: {
                Text("Get started").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            Button("Try without a computer") {
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
    let text: LocalizedStringKey

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
            Text("Connected!")
                .font(.largeTitle.bold())
            Text("You can now see your conversations while you're on the same Wi-Fi as your computer.")
            VStack(alignment: .leading, spacing: 8) {
                Label("Away from home?", systemImage: "globe")
                    .font(.headline)
                Text("Install Tailscale on your computer and your phone with the same account. Then run `remote-sessions pair` again and scan the code: it will include the Tailscale address.")
                    .foregroundStyle(.secondary)
                Link("Download Tailscale", destination: Links.tailscale)
            }
            .padding()
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
            Spacer()
            Button {
                onFinish()
            } label: {
                Text("See my conversations").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(24)
        .navigationBarBackButtonHidden()
    }
}
