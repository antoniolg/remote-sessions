import SwiftUI

/// Picks a folder of the computer, from recent projects or by browsing, to start a new conversation in.
struct NewSessionView: View {
    /// Conversations already loaded, to suggest their folders.
    let sessions: [Session]
    let onStart: (_ folder: String, _ title: String?) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var browsing = false
    #if DEBUG
    /// Store screenshots: REMOTE_SESSIONS_SCREEN=folders opens the folder browser.
    private let browseOnAppear = ProcessInfo.processInfo.environment["REMOTE_SESSIONS_SCREEN"] == "folders"
    #else
    private let browseOnAppear = false
    #endif

    /// The folders of recent conversations, newest first.
    private var recent: [(folder: String, project: String)] {
        var seen = Set<String>()
        return sessions.sorted { $0.updatedAt > $1.updatedAt }.compactMap { session in
            guard let cwd = session.cwd, seen.insert(cwd).inserted else { return nil }
            return (cwd, session.project ?? (cwd as NSString).lastPathComponent)
        }
        .prefix(8)
        .map { $0 }
    }

    private var title: String? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("Name (optional)", text: $name)
                        .submitLabel(.done)
                } footer: {
                    Text("Claude Code starts in the folder you choose and opens in the Claude app with Remote Control.")
                }
                if !recent.isEmpty {
                    Section("Recent projects") {
                        ForEach(recent, id: \.folder) { item in
                            Button {
                                start(item.folder)
                            } label: {
                                FolderRow(name: item.project, detail: item.folder, systemImage: "folder")
                            }
                            .tint(.primary)
                        }
                    }
                }
                Section {
                    Button {
                        browsing = true
                    } label: {
                        Label("Choose another folder", systemImage: "folder.badge.plus")
                    }
                }
            }
            .navigationTitle("New conversation")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(isPresented: $browsing) {
                FolderBrowserView(path: nil, onPick: start)
            }
            .onAppear { if browseOnAppear { browsing = true } }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func start(_ folder: String) {
        onStart(folder, title)
    }
}

/// One level of the computer's folders, starting at the home folder.
struct FolderBrowserView: View {
    let path: String?
    let onPick: (String) -> Void
    @Environment(ComputerStore.self) private var store
    @State private var listing: FolderListing?
    @State private var error: String?

    private var title: String {
        guard let listing else { return "" }
        return listing.path == listing.home ? String(localized: "Home folder") : (listing.path as NSString).lastPathComponent
    }

    var body: some View {
        Group {
            if let listing {
                List {
                    Section {
                        ForEach(listing.folders) { folder in
                            NavigationLink {
                                FolderBrowserView(path: folder.path, onPick: onPick)
                            } label: {
                                Label(folder.name, systemImage: "folder")
                            }
                        }
                    } header: {
                        Text(verbatim: listing.path)
                            .textCase(nil)
                    }
                }
                .overlay {
                    if listing.folders.isEmpty {
                        ContentUnavailableView("No subfolders", systemImage: "folder",
                                               description: Text("You can start the conversation in this folder."))
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    Button {
                        onPick(listing.path)
                    } label: {
                        Text("Start here").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .padding()
                    .background(.bar)
                }
            } else if let error {
                ContentUnavailableView {
                    Label("Couldn't open the folder", systemImage: "folder.badge.questionmark")
                } description: {
                    Text(error)
                } actions: {
                    Button("Try again") { Task { await load() } }
                }
            } else {
                ProgressView()
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        guard let source = store.source else { return }
        error = nil
        do {
            listing = try await source.folders(path: path)
        } catch where error.isCancellation {
            // Left the screen.
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct FolderRow: View {
    let name: String
    let detail: String
    let systemImage: String

    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                Text(verbatim: detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.head)
            }
        } icon: {
            Image(systemName: systemImage)
        }
    }
}
