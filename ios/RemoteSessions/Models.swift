import Foundation

struct Session: Identifiable, Decodable, Hashable {
    struct Running: Decodable, Hashable {
        let kind: String
        let status: String?
    }

    struct Remote: Decodable, Hashable {
        let url: URL
    }

    let id: String
    let title: String
    let lastPrompt: String?
    let cwd: String?
    let project: String?
    let updatedAt: Date
    let running: Running?
    let remote: Remote?

    /// The server sends an empty title when the conversation has none.
    var displayTitle: String {
        title.isEmpty ? String(localized: "Untitled") : title
    }
}

struct Message: Identifiable, Decodable, Hashable {
    let id: String
    let role: String
    let text: String
    let tools: [String]
    let timestamp: Date?
}

struct SessionList: Decodable {
    let sessions: [Session]
}

struct MessageList: Decodable {
    let messages: [Message]
}

struct RemoteControlResult: Decodable {
    let url: URL
}

struct Health: Decodable {
    let id: String
    let name: String
    let version: String
}

struct APIError: Decodable {
    let code: String?
    let error: String
    let folder: String?
}

/// A paired computer. The token lives in the Keychain, not here.
struct Computer: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var port: Int
    var hosts: [String]
    var fingerprint: String
    var lastHost: String?

    /// Hosts to try, the last one that worked first.
    var orderedHosts: [String] {
        guard let lastHost else { return hosts }
        return [lastHost] + hosts.filter { $0 != lastHost }
    }
}

/// `remotesessions://pair?v=1&id=…&name=…&port=…&hosts=a,b&token=…&fp=…` (docs/API.md).
struct PairingLink: Equatable {
    let computer: Computer
    let token: String

    init?(_ text: String) {
        guard let components = URLComponents(string: text.trimmingCharacters(in: .whitespacesAndNewlines)),
              components.scheme == "remotesessions", components.host == "pair"
        else { return nil }
        let items = Dictionary((components.queryItems ?? []).compactMap { item in item.value.map { (item.name, $0) } },
                               uniquingKeysWith: { _, last in last })
        guard items["v"] == "1", let id = items["id"], !id.isEmpty,
              let token = items["token"], !token.isEmpty,
              let fingerprint = items["fp"]?.lowercased(), fingerprint.count == 64,
              let port = Int(items["port"] ?? ""), (1...65535).contains(port)
        else { return nil }
        let hosts = (items["hosts"] ?? "").split(separator: ",").map(String.init).filter { !$0.isEmpty }
        guard !hosts.isEmpty else { return nil }
        computer = Computer(id: id, name: items["name"] ?? String(localized: "Computer"), port: port, hosts: hosts, fingerprint: fingerprint)
        self.token = token
    }
}
