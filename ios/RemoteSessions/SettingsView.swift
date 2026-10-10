import SwiftUI

struct SettingsView: View {
    @Environment(ComputerStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var addingComputer = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    ForEach(store.computers) { computer in
                        Button {
                            store.select(computer)
                            store.demoMode = false
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(computer.name).foregroundStyle(.primary)
                                    Text(verbatim: (computer.lastHost ?? computer.hosts.first ?? "") + ":\(computer.port)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if computer.id == store.selected?.id && !store.demoMode {
                                    Image(systemName: "checkmark").foregroundStyle(.tint)
                                }
                            }
                        }
                    }
                    .onDelete { offsets in
                        offsets.map { store.computers[$0] }.forEach(store.remove)
                    }
                    Button("Add computer", systemImage: "plus") { addingComputer = true }
                } header: {
                    Text("Computers")
                } footer: {
                    Text("Swipe to forget a computer. To revoke access from the computer, run `remote-sessions pair --rotate`.")
                }

                Section {
                    Toggle("Demo mode", isOn: Binding(get: { store.demoMode }, set: { store.demoMode = $0 }))
                } footer: {
                    Text("Shows sample conversations without connecting to any computer.")
                }

                Section("About") {
                    Link("How to install the server", destination: Links.home)
                    Link("Privacy policy", destination: Links.privacy)
                    Link("Source code", destination: Links.source)
                    LabeledContent("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
                }

                Section {
                } footer: {
                    Text("Remote Sessions is not an official Anthropic app. Claude and Claude Code are trademarks of Anthropic.")
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .fullScreenCover(isPresented: $addingComputer) {
                OnboardingView(startAtInstall: true) { addingComputer = false }
            }
        }
    }
}

enum Links {
    static let home = URL(string: "https://antonioleiva.com/en/projects/remote-sessions")!
    static let privacy = URL(string: "https://antonioleiva.com/remote-sessions/privacy")!
    static let source = URL(string: "https://github.com/antoniolg/remote-sessions")!
    static let tailscale = URL(string: "https://tailscale.com/download")!
}
