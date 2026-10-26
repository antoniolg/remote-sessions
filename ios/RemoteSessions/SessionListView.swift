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
    /// By id, so the detail follows the reloaded session. A split view in regular width (iPad, the open
    /// iPhone Duo); collapsed into a stack in compact width.
    @State private var selectedID: Session.ID?
    /// Starts with the list showing: in portrait the split view would hide it behind an empty detail.
    @State private var columnVisibility = Self.initialVisibility

    private static var initialVisibility: NavigationSplitViewVisibility {
        #if DEBUG
        // Store screenshots of the detail: the split view ignores a change made while it first lays out.
        if ProcessInfo.processInfo.environment["REMOTE_SESSIONS_SCREEN"] == "detail" { return .detailOnly }
        #endif
        return .all
    }
    /// Taller than wide: the list covers the detail instead of sitting beside it.
    @State private var listOverDetail = false
    /// Where an active vertical fold is (iPhone Duo in book pose), so the list ends at it.
    @State private var foldX: CGFloat?

    private var selected: Session? {
        sessions.first { $0.id == selectedID }
    }

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
        // The launch video shows a computer name, like a paired computer would, instead of "Demo".
        if store.demoMode && DemoSource.video { return project ?? "MacBook Pro" }
        return store.demoMode ? String(localized: "Demo") : project ?? store.selected?.name ?? "Remote Sessions"
    }

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
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
            .task(id: "\(store.version)|\(connector.changes)") { await load() }
            .navigationSplitViewColumnWidth(min: foldX ?? 320, ideal: foldX ?? 380, max: foldX ?? 460)
        } detail: {
            if let selected {
                SessionDetailView(session: selected)
                    .id(selected.id)
            } else {
                ContentUnavailableView("Select a conversation", systemImage: "bubble.left.and.bubble.right")
            }
        }
        .onGeometryChange(for: Bool.self) { $0.size.height > $0.size.width } action: { over in
            listOverDetail = over
            // Beside the detail (turned, unfolded): show the list again. Over it: keep an open conversation in view.
            if !over { columnVisibility = .all } else if selectedID != nil { columnVisibility = .detailOnly }
        }
        .onGeometryChange(for: CGFloat?.self) { proxy in
            guard #available(iOS 27.1, *) else { return nil }
            return proxy.reservedRegions(kind: .division)
                .first { $0.isActive && $0.frame.height > $0.frame.width }?.frame.midX
        } action: { foldX = $0 }
        .onChange(of: selectedID) { _, id in
            if id != nil && listOverDetail { columnVisibility = .detailOnly }
        }
        .modifier(ConnectorPresentation(connector: connector))
        .environment(connector)
    }

    private var list: some View {
        List(visible, selection: $selectedID) { session in
            NavigationLink(value: session.id) {
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
            if selectedID != nil && selected == nil { selectedID = nil }
            #if DEBUG
            // Store screenshots: REMOTE_SESSIONS_SCREEN=detail opens the first conversation.
            let screen = ProcessInfo.processInfo.environment["REMOTE_SESSIONS_SCREEN"]
            if screen == "detail", selectedID == nil, let first = sessions.first {
                selectedID = first.id
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
            AvailabilityLabel(session: session)
                .font(.caption.weight(.medium))
        }
        .padding(.vertical, 4)
    }
}
