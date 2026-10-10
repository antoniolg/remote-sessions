import CryptoKit
import Foundation

/// What the screens need, served by a paired computer or by the demo.
protocol SessionSource: Sendable {
    func sessions() async throws -> [Session]
    func messages(sessionID: String) async throws -> [Message]
    func connect(sessionID: String, trustFolder: Bool) async throws -> URL
    func disconnect(sessionID: String) async throws
}

enum SourceError: LocalizedError {
    case server(String)
    /// An API error: a stable code (docs/API.md) translated here, with the server's English text as fallback.
    case api(code: String?, message: String)
    /// Claude Code asks whether to trust this folder; the user decides and connects again.
    case trustRequired(folder: String)
    case unreachable(String)
    case demo

    var errorDescription: String? {
        switch self {
        case .server(let message): message
        case .api(let code, let message):
            switch code {
            case "unauthorized": String(localized: "This computer no longer recognizes this phone. Scan its code again with `remote-sessions pair`.")
            case "not_found": String(localized: "That conversation no longer exists on the computer.")
            case "open_elsewhere": String(localized: "The conversation is open on the computer. Close it there, or type /remote-control in it.")
            case "remote_control_timeout": String(localized: "Remote Control didn't respond in time. Check that Claude Code is signed in with your Claude subscription.")
            case "launch_failed": String(localized: "Claude Code couldn't resume the conversation.")
            case "folder_access": String(localized: "The computer doesn't let Remote Sessions open this conversation's folder. On a Mac, allow remote-sessions in System Settings › Privacy & Security › Files and Folders.")
            case "prompt_blocked": String(localized: "Claude Code is waiting for an answer on the computer. Open the conversation there to continue.")
            default: message
            }
        case .trustRequired(let folder):
            String(localized: "Claude Code asks whether you trust the folder \(folder). Trust it only if it's your own project.")
        case .unreachable(let name):
            String(localized: "Can't find \(name). Check that it's turned on, that the server is running and that you're both on the same Wi-Fi or on Tailscale.")
        case .demo: String(localized: "This is a demo. Pair your computer to connect for real.")
        }
    }
}

/// Talks to a paired computer over HTTPS, trusting only its pinned certificate and trying each known host.
struct APIClient: SessionSource {
    let computer: Computer
    let token: String
    let onReachable: @MainActor @Sendable (String) -> Void

    func sessions() async throws -> [Session] {
        try await request("v1/sessions", as: SessionList.self).sessions
    }

    func messages(sessionID: String) async throws -> [Message] {
        try await request("v1/sessions/\(sessionID)/messages?limit=60", as: MessageList.self).messages
    }

    func connect(sessionID: String, trustFolder: Bool) async throws -> URL {
        let body = trustFolder ? Data(#"{"trustFolder":true}"#.utf8) : nil
        return try await request("v1/sessions/\(sessionID)/remote-control", method: "POST", body: body, timeout: 70, as: RemoteControlResult.self).url
    }

    func disconnect(sessionID: String) async throws {
        _ = try await data("v1/sessions/\(sessionID)/remote-control", method: "DELETE", timeout: 20)
    }

    /// Checks a pairing before saving it.
    func health() async throws -> Health {
        try await request("health", as: Health.self)
    }

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: Data? = nil, timeout: TimeInterval = 20, as type: T.Type) async throws -> T {
        try await JSONDecoder.api.decode(T.self, from: data(path, method: method, body: body, timeout: timeout))
    }

    private func data(_ path: String, method: String, body: Data? = nil, timeout: TimeInterval) async throws -> Data {
        let session = URLSession(configuration: .ephemeral, delegate: PinningDelegate(fingerprint: computer.fingerprint), delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }
        // Reuse the address that answered recently; otherwise race every known one.
        if let host = await ReachableHosts.shared.host(for: computer.id) {
            do {
                return try await attempt(session, host: host, path: path, method: method, body: body, timeout: timeout)
            } catch let error as URLError where error.isUnreachable {
                await ReachableHosts.shared.forget(computer.id)
            }
        }
        guard let host = await findHost(session) else { throw SourceError.unreachable(computer.name) }
        await ReachableHosts.shared.remember(host, for: computer.id)
        await onReachable(host)
        return try await attempt(session, host: host, path: path, method: method, body: body, timeout: timeout)
    }

    /// Asks every known address at once (home network, Tailscale…) and returns the first that answers.
    /// Away from home the LAN address just hangs, so trying them one by one wasted the whole timeout.
    private func findHost(_ session: URLSession) async -> String? {
        if let host = await firstHealthy(session, hosts: computer.orderedHosts) { return host }
        // None answered: ask Bonjour where the computer is now.
        guard let found = await Discovery.find(serverID: computer.id) else { return nil }
        return await firstHealthy(session, hosts: [found])
    }

    private func firstHealthy(_ session: URLSession, hosts: [String]) async -> String? {
        await withTaskGroup(of: String?.self) { group in
            for host in hosts {
                group.addTask {
                    let health = try? await attempt(session, host: host, path: "health", method: "GET", body: nil, timeout: 6)
                    guard let health, let info = try? JSONDecoder.api.decode(Health.self, from: health), info.id == computer.id else { return nil }
                    return host
                }
            }
            for await host in group {
                if let host {
                    group.cancelAll()
                    return host
                }
            }
            return nil
        }
    }

    private func attempt(_ session: URLSession, host: String, path: String, method: String, body: Data?, timeout: TimeInterval) async throws -> Data {
        let hostPart = host.contains(":") ? "[\(host)]" : host
        guard let url = URL(string: "https://\(hostPart):\(computer.port)/\(path)") else { throw SourceError.server(String(localized: "Invalid address: \(host)")) }
        var request = URLRequest(url: url, timeoutInterval: timeout)
        request.httpMethod = method
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw SourceError.server(String(localized: "Unexpected response from the computer")) }
        guard (200..<300).contains(http.statusCode) else {
            let error = try? JSONDecoder().decode(APIError.self, from: data)
            if error?.code == "trust_required" { throw SourceError.trustRequired(folder: error?.folder ?? "") }
            throw SourceError.api(code: error?.code, message: error?.error ?? "HTTP \(http.statusCode)")
        }
        return data
    }
}

/// The address each computer answered on lately, shared by every request.
actor ReachableHosts {
    static let shared = ReachableHosts()
    private var hosts: [String: (host: String, at: Date)] = [:]

    func host(for id: String) -> String? {
        guard let entry = hosts[id], Date().timeIntervalSince(entry.at) < 120 else { return nil }
        return entry.host
    }

    func remember(_ host: String, for id: String) {
        hosts[id] = (host, Date())
    }

    func forget(_ id: String) {
        hosts[id] = nil
    }
}

private extension URLError {
    /// Failures that mean "try the next address"; a pinning failure is not one of them.
    var isUnreachable: Bool {
        [.cannotConnectToHost, .cannotFindHost, .timedOut, .networkConnectionLost, .notConnectedToInternet, .dnsLookupFailed,
         .secureConnectionFailed, .cannotLoadFromNetwork]
            .contains(code)
    }
}

/// Accepts the server only if its leaf certificate matches the fingerprint from the pairing code.
final class PinningDelegate: NSObject, URLSessionDelegate, Sendable {
    let fingerprint: String

    init(fingerprint: String) {
        self.fingerprint = fingerprint
    }

    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge) async
        -> (URLSession.AuthChallengeDisposition, URLCredential?) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust,
              let leaf = (SecTrustCopyCertificateChain(trust) as? [SecCertificate])?.first
        else { return (.cancelAuthenticationChallenge, nil) }
        let digest = SHA256.hash(data: SecCertificateCopyData(leaf) as Data)
        let hex = digest.map { String(format: "%02x", $0) }.joined()
        return hex == fingerprint ? (.useCredential, URLCredential(trust: trust)) : (.cancelAuthenticationChallenge, nil)
    }
}

extension JSONDecoder {
    static let api: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            // Honours the offset ("Z" or "+02:00"), with or without fractional seconds.
            if let date = try? Date(text, strategy: Date.ISO8601FormatStyle(includingFractionalSeconds: true)) { return date }
            if let date = try? Date(text, strategy: Date.ISO8601FormatStyle()) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Invalid date: \(text)"))
        }
        return decoder
    }()
}
