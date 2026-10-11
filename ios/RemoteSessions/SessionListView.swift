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
    @State private var creating = false
    @Environment(\.openURL) private var openURL
    @State private var path: [Session] = []

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
        store.demoMode ? String(localized: "Demo") : project ?? store.selected?.name ?? "Remote Sessions"
    }

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if sessions.isEmpty && loading {
                    ProgressView("Loading conversations…")
                } else if sessions.isEmpty, let loadError {
                    ContentUnavailableView {
                        Label("No connection", systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(loadError)
                    } actions: {
                        Button("Try again") { Task { await load() } }
                        Button("Settings") { showingSettings = true }
                    }
                } else {
                    list
                }
            }
            .navigationTitle(title)
            .searchable(text: $search, prompt: "Search conversations")
            .toolbar { toolbar }
            .refreshable { await load() }
            .sheet(isPresented: $showingSettings) { SettingsView() }
            .sheet(isPresented: $creating) {
                NewSessionView(sessions: sessions) { folder, title in
                    creating = false
                    connector.create(in: folder, title: title, source: store.source, openURL: openURL)
                }
            }
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
                    ContentUnavailableView("No conversations", systemImage: "bubble.left.and.bubble.right",
                                           description: Text("When you use Claude Code on this computer, your conversations will show up here."))
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
                    Picker("Computer", selection: Binding(get: { store.selected }, set: { if let computer = $0 { store.select(computer) } })) {
                        ForEach(store.computers) { Text($0.name).tag(Optional($0)) }
                    }
                }
                Picker("Project", selection: $project) {
                    Text("All projects").tag(String?.none)
                    ForEach(projects, id: \.self) { Text($0).tag(String?.some($0)) }
                }
            } label: {
                Label("Filter", systemImage: project == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
            }
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button("Settings", systemImage: "gearshape") { showingSettings = true }
        }
        ToolbarItem(placement: .topBarTrailing) {
            Button("New conversation", systemImage: "plus") { creating = true }
                .disabled(store.source == nil || connector.opening != nil)
        }
    }

    private func load() async {
        guard let source = store.source else { return }
        loading = true
        defer { loading = false }
        do {
            sessions = try await source.sessions()
            loadError = nil
            #if DEBUG
            // Store screenshots: REMOTE_SESSIONS_SCREEN=detail opens the first conversation.
            let screen = ProcessInfo.processInfo.environment["REMOTE_SESSIONS_SCREEN"]
            if screen == "detail", path.isEmpty, let first = sessions.first {
                path = [first]
            }
            // …and new|folders opens the new conversation sheet.
            if screen == "new" || screen == "folders" { creating = true }
            #endif
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
                        .accessibilityLabel(session.remote != nil ? String(localized: "Running with Remote Control") : String(localized: "Open on the computer"))
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
