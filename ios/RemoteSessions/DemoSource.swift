import Foundation

/// Sample data so the app can be tried (and reviewed) without a computer.
struct DemoSource: SessionSource {
    private static let now = Date()

    private static func ago(_ minutes: Double) -> Date {
        now.addingTimeInterval(-minutes * 60)
    }

    func sessions() async throws -> [Session] {
        [
            Session(id: "demo-1", title: String(localized: "Fix Google sign-in"), lastPrompt: String(localized: "Add a test for the expired token case"),
                    cwd: "~/Projects/shop", project: "shop", updatedAt: Self.ago(4), running: .init(kind: "interactive", status: "busy"), remote: nil),
            Session(id: "demo-2", title: String(localized: "Migrate the API to version 2"), lastPrompt: String(localized: "Review the missing endpoints"),
                    cwd: "~/Projects/api", project: "api", updatedAt: Self.ago(95), running: nil, remote: nil),
            Session(id: "demo-3", title: String(localized: "Ideas for the October newsletter"), lastPrompt: String(localized: "Give me three shorter headlines"),
                    cwd: "~/Documents/Content", project: "Content", updatedAt: Self.ago(60 * 26), running: nil, remote: nil),
        ]
    }

    func messages(sessionID: String) async throws -> [Message] {
        [
            Message(id: "m1", role: "user", text: String(localized: "Google sign-in fails when the token has expired. Can you take a look?"), tools: [], timestamp: Self.ago(30)),
            Message(id: "m2", role: "assistant", text: String(localized: "I found the problem: `refreshToken()` isn't called before retrying. I fixed it in **AuthService** and now the session renews itself."),
                    tools: ["Read", "Read", "Edit"], timestamp: Self.ago(28)),
            Message(id: "m3", role: "user", text: String(localized: "Add a test for the expired token case"), tools: [], timestamp: Self.ago(5)),
            Message(id: "m4", role: "assistant", text: String(localized: "Done: `AuthServiceTests.testRefreshesExpiredToken` covers the case and passes along with the rest of the suite."),
                    tools: ["Edit", "Bash"], timestamp: Self.ago(4)),
        ]
    }

    func connect(sessionID: String) async throws -> URL {
        throw SourceError.demo
    }

    func disconnect(sessionID: String) async throws {
        throw SourceError.demo
    }
}
