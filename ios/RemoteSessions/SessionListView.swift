import SwiftUI

struct SessionListView: View {
    @Environment(ComputerStore.self) private var store
    @State private var connector = Connector()
    @State private var sessions: [Session] = []
    @State private var search = ""
    @State private var project: String?
    @State private var loading = false
    @State private var loadError: String?
    @State private var showingSettings = false

    private var projects: [String] {
        Array(Set(sessions.compactMap(\.project))).sorted { $0.localizedCaseInsensitiveCompare($1) == .orderedAscending }
    }

    private var visible: [Session] {
        sessions.filter { session in
            (project == nil || session.project == project) &&
                (search.isEmpty || [session.title, session.lastPrompt ?? "", session.cwd ?? ""]
                    .contains { $0.localizedCaseInsensitiveContains(search) })
        }
    }

    private var title: String {
        store.demoMode ? "Demo" : project ?? store.selected?.name ?? "Remote Sessions"
    }

    var body: some View {
        NavigationStack {
            Group {
                if sessions.isEmpty && loading {
                    ProgressView("Cargando conversaciones…")
                } else if sessions.isEmpty, let loadError {
                    ContentUnavailableView {
                        Label("Sin conexión", systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(loadError)
                    } actions: {
                        Button("Reintentar") { Task { await load() } }
                        Button("Ajustes") { showingSettings = true }
                    }
                } else {
                    list
                }
            }
            .navigationTitle(title)
            .searchable(text: $search, prompt: "Buscar conversaciones")
            .toolbar { toolbar }
            .refreshable { await load() }
            .sheet(isPresented: $showingSettings) { SettingsView() }
            .navigationDestination(for: Session.self) { SessionDetailView(session: $0) }
            .task(id: "\(store.version)|\(connector.changes)") { await load() }
        }
        .modifier(ConnectorPresentation(connector: connector))
        .environment(connector)
    }

    private var list: some View {
        List(visible) { session in
            NavigationLink(value: session) {
                HStack(alignment: .center, spacing: 12) {
                    SessionRow(session: session)
                    ConnectButton(session: session)
                }
            }
        }
        .listStyle(.plain)
        .overlay {
            if visible.isEmpty && !loading {
                if search.isEmpty {
                    ContentUnavailableView("Sin conversaciones", systemImage: "bubble.left.and.bubble.right",
                                           description: Text("Cuando uses Claude Code en este ordenador, aparecerán aquí."))
                } else {
                    ContentUnavailableView.search(text: search)
                }
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Menu {
                if store.computers.count > 1 {
                    Picker("Ordenador", selection: Binding(get: { store.selected }, set: { if let computer = $0 { store.select(computer) } })) {
                        ForEach(store.computers) { Text($0.name).tag(Optional($0)) }
                    }
                }
                Picker("Proyecto", selection: $project) {
                    Text("Todos los proyectos").tag(String?.none)
                    ForEach(projects, id: \.self) { Text($0).tag(String?.some($0)) }
                }
            } label: {
                Image(systemName: project == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
            }
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button { showingSettings = true } label: { Image(systemName: "gearshape") }
        }
    }

    private func load() async {
        guard let source = store.source else { return }
        loading = true
        defer { loading = false }
        do {
            sessions = try await source.sessions()
            loadError = nil
        } catch where error.isCancellation {
            // A newer load replaced this one.
        } catch {
            loadError = error.localizedDescription
            if !sessions.isEmpty { connector.errorMessage = loadError }
        }
    }
}

private struct SessionRow: View {
    let session: Session

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(session.displayTitle)
                    .font(.headline)
                    .lineLimit(2)
                Spacer(minLength: 8)
                if session.running != nil {
                    Image(systemName: session.remote != nil ? "antenna.radiowaves.left.and.right.circle.fill" : "circle.fill")
                        .foregroundStyle(.green)
                        .imageScale(.small)
                        .accessibilityLabel(session.remote != nil ? "Con Remote Control" : "Abierta en el ordenador")
                }
            }
            if let lastPrompt = session.lastPrompt, lastPrompt != session.displayTitle {
                Text(lastPrompt)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            HStack(spacing: 6) {
                if let project = session.project {
                    Label(project, systemImage: "folder")
                }
                Text(session.updatedAt, format: .relative(presentation: .named))
            }
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}
