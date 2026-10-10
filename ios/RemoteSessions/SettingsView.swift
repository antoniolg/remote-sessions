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
                                    Text((computer.lastHost ?? computer.hosts.first ?? "") + ":\(computer.port)")
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
                    Button("Añadir ordenador", systemImage: "plus") { addingComputer = true }
                } header: {
                    Text("Ordenadores")
                } footer: {
                    Text("Desliza para olvidar un ordenador. Para revocar el acceso desde el ordenador, ejecuta `remote-sessions pair --rotate`.")
                }

                Section {
                    Toggle("Modo demostración", isOn: Binding(get: { store.demoMode }, set: { store.demoMode = $0 }))
                } footer: {
                    Text("Muestra conversaciones de ejemplo sin conectarse a ningún ordenador.")
                }

                Section("Información") {
                    Link("Cómo instalar el servidor", destination: Links.home)
                    Link("Política de privacidad", destination: Links.privacy)
                    Link("Código fuente", destination: Links.source)
                    LabeledContent("Versión", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
                }

                Section {
                } footer: {
                    Text("Remote Sessions no es una app oficial de Anthropic. Claude y Claude Code son marcas de Anthropic.")
                }
            }
            .navigationTitle("Ajustes")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Hecho") { dismiss() }
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
