import Foundation
import Observation
import Security

/// Paired computers (UserDefaults) and their tokens (Keychain), plus the selected one and demo mode.
@MainActor
@Observable
final class ComputerStore {
    private static let computersKey = "computers"
    private static let selectedKey = "selectedComputer"
    private static let demoKey = "demoMode"

    private(set) var computers: [Computer] = []
    var selectedID: String? {
        didSet { UserDefaults.standard.set(selectedID, forKey: Self.selectedKey) }
    }
    var demoMode: Bool {
        didSet { UserDefaults.standard.set(demoMode, forKey: Self.demoKey) }
    }
    /// Bumped when the selected connection changes, to reload the lists.
    private(set) var version = 0

    var selected: Computer? {
        computers.first { $0.id == selectedID } ?? computers.first
    }

    var needsOnboarding: Bool {
        computers.isEmpty && !demoMode
    }

    /// The data source for the selected computer, or the demo.
    var source: SessionSource? {
        if demoMode { return DemoSource() }
        guard let computer = selected, let token = Keychain.get(account: computer.id) else { return nil }
        return APIClient(computer: computer, token: token) { [weak self] host in
            self?.remember(host: host, for: computer.id)
        }
    }

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.computersKey),
           let saved = try? JSONDecoder().decode([Computer].self, from: data) {
            computers = saved
        }
        selectedID = UserDefaults.standard.string(forKey: Self.selectedKey)
        demoMode = UserDefaults.standard.bool(forKey: Self.demoKey)
    }

    /// Adds the computer of a pairing link (replacing it if already paired) and selects it.
    func add(_ link: PairingLink) {
        Keychain.set(link.token, account: link.computer.id)
        computers.removeAll { $0.id == link.computer.id }
        computers.append(link.computer)
        selectedID = link.computer.id
        demoMode = false
        save()
    }

    func remove(_ computer: Computer) {
        Keychain.set("", account: computer.id)
        computers.removeAll { $0.id == computer.id }
        if selectedID == computer.id { selectedID = computers.first?.id }
        save()
    }

    func select(_ computer: Computer) {
        selectedID = computer.id
        version += 1
    }

    private func remember(host: String, for id: String) {
        guard let index = computers.firstIndex(where: { $0.id == id }), computers[index].lastHost != host else { return }
        computers[index].lastHost = host
        if !computers[index].hosts.contains(host) { computers[index].hosts.append(host) }
        persist()
    }

    private func save() {
        persist()
        version += 1
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(computers) {
            UserDefaults.standard.set(data, forKey: Self.computersKey)
        }
    }
}

enum Keychain {
    static let service = "com.antonioleiva.remotesessions"

    static func get(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func set(_ value: String, account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
        guard !value.isEmpty else { return }
        var attributes = query
        attributes[kSecValueData as String] = Data(value.utf8)
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }
}
