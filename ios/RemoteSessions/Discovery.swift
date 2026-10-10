import Foundation
import Network

/// Finds a paired server on the local network by its Bonjour TXT `id` (docs/API.md).
enum Discovery {
    static let serviceType = "_remotesessions._tcp"

    /// Returns the IP address of the server with this id, or nil after a few seconds.
    static func find(serverID: String, timeout: Duration = .seconds(4)) async -> String? {
        await withTaskGroup(of: String?.self) { group in
            group.addTask { await browse(serverID: serverID) }
            group.addTask {
                try? await Task.sleep(for: timeout)
                return nil
            }
            let first = await group.next() ?? nil
            group.cancelAll()
            return first
        }
    }

    private static func browse(serverID: String) async -> String? {
        let browser = NWBrowser(for: .bonjourWithTXTRecord(type: serviceType, domain: nil), using: .tcp)
        let endpoint: NWEndpoint? = await withTaskCancellationHandler {
            await withCheckedContinuation { continuation in
                let once = Once(continuation)
                browser.browseResultsChangedHandler = { results, _ in
                    for result in results {
                        if case .bonjour(let txt) = result.metadata, txt["id"] == serverID {
                            once.resume(result.endpoint)
                        }
                    }
                }
                browser.stateUpdateHandler = { state in
                    if case .failed = state { once.resume(nil) }
                    if case .cancelled = state { once.resume(nil) }
                }
                browser.start(queue: .global())
            }
        } onCancel: {
            browser.cancel()
        }
        browser.cancel()
        guard let endpoint else { return nil }
        return await resolve(endpoint)
    }

    /// Connects to the Bonjour endpoint just to learn its IP address.
    private static func resolve(_ endpoint: NWEndpoint) async -> String? {
        let parameters = NWParameters.tcp
        if let options = parameters.defaultProtocolStack.internetProtocol as? NWProtocolIP.Options {
            options.version = .v4
        }
        let connection = NWConnection(to: endpoint, using: parameters)
        let host: String? = await withCheckedContinuation { continuation in
            let once = Once(continuation)
            connection.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    if case .hostPort(let host, _) = connection.currentPath?.remoteEndpoint {
                        once.resume("\(host)".components(separatedBy: "%").first)
                    } else {
                        once.resume(nil)
                    }
                case .failed, .cancelled:
                    once.resume(nil)
                default:
                    break
                }
            }
            connection.start(queue: .global())
        }
        connection.cancel()
        return host
    }
}

/// Resumes a continuation at most once; Network callbacks can fire repeatedly.
private final class Once<T: Sendable>: @unchecked Sendable {
    private var continuation: CheckedContinuation<T, Never>?
    private let lock = NSLock()

    init(_ continuation: CheckedContinuation<T, Never>) {
        self.continuation = continuation
    }

    func resume(_ value: T) {
        lock.lock()
        let pending = continuation
        continuation = nil
        lock.unlock()
        pending?.resume(returning: value)
    }
}
