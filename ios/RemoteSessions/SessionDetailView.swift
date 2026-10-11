import SwiftUI

/// The latest messages of a conversation, with a button to continue it on the phone.
struct SessionDetailView: View {
    let session: Session
    @Environment(ComputerStore.self) private var store
    @Environment(Connector.self) private var connector
    @State private var current: Session?
    @State private var messages: [Message] = []
    @State private var loading = false
    @State private var loadError: String?

    private var shown: Session { current ?? session }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    if messages.isEmpty && loading {
                        ProgressView().padding(.top, 40)
                    } else if messages.isEmpty, let loadError {
                        ContentUnavailableView("Couldn't load the messages", systemImage: "exclamationmark.bubble", description: Text(loadError))
                    }
                    ForEach(messages) { MessageBubble(message: $0).id($0.id) }
                }
                .padding()
            }
            .defaultScrollAnchor(.bottom)
            .onChange(of: messages.last?.id) { _, last in
                if let last { proxy.scrollTo(last, anchor: .bottom) }
            }
        }
        .navigationTitle(shown.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if shown.remote != nil && shown.startedByServer {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Stop", role: .destructive) {
                        Task { await connector.stop(shown, source: store.source) }
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 6) {
                AvailabilityLabel(session: shown)
                    .font(.footnote.weight(.medium))
                ConnectButton(session: shown, prominent: true)
                    .controlSize(.large)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(.bar)
        }
        .refreshable { await load() }
        .task(id: connector.changes) { await load() }
    }

    private func load() async {
        guard let source = store.source else { return }
        loading = true
        defer { loading = false }
        do {
            async let latest = source.messages(sessionID: session.id)
            async let all = source.sessions()
            messages = try await latest
            current = try await all.first { $0.id == session.id }
            loadError = nil
        } catch where error.isCancellation {
            // Left the screen.
        } catch {
            loadError = error.localizedDescription
        }
    }
}

private struct MessageBubble: View {
    let message: Message

    private var isUser: Bool { message.role == "user" }

    private var attributed: AttributedString {
        (try? AttributedString(markdown: message.text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
            ?? AttributedString(message.text)
    }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 6) {
                if !message.text.isEmpty {
                    Text(attributed)
                        .textSelection(.enabled)
                }
                if !message.tools.isEmpty {
                    Label(ToolSummary.text(message.tools), systemImage: "wrench.and.screwdriver")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let date = message.timestamp {
                    Text(date, format: .relative(presentation: .named))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(12)
            .background(isUser ? Color.accentColor.opacity(0.18) : Color(.secondarySystemBackground),
                        in: RoundedRectangle(cornerRadius: 14))
            if !isUser { Spacer(minLength: 40) }
        }
    }
}

enum ToolSummary {
    /// "Read ×3, Edit": tool names in order of first use, with counts.
    static func text(_ tools: [String]) -> String {
        var counts: [(String, Int)] = []
        for tool in tools {
            if let index = counts.firstIndex(where: { $0.0 == tool }) { counts[index].1 += 1 } else { counts.append((tool, 1)) }
        }
        return counts.map { $0.1 > 1 ? "\($0.0) ×\($0.1)" : $0.0 }.joined(separator: ", ")
    }
}
