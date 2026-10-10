import Foundation
import Testing
@testable import RemoteSessions

struct PairingLinkTests {
    let fingerprint = String(repeating: "ab", count: 32)

    @Test func parsesAValidLink() throws {
        let link = try #require(PairingLink("remotesessions://pair?v=1&id=abc&name=Mac%20de%20Antonio&port=8787&hosts=192.168.1.2,100.64.0.3&token=t%2Bk&fp=\(fingerprint.uppercased())"))
        #expect(link.computer.id == "abc")
        #expect(link.computer.name == "Mac de Antonio")
        #expect(link.computer.port == 8787)
        #expect(link.computer.hosts == ["192.168.1.2", "100.64.0.3"])
        #expect(link.computer.fingerprint == fingerprint)
        #expect(link.token == "t+k")
    }

    @Test(arguments: [
        "https://example.com",
        "remotesessions://pair?v=2&id=a&port=1&hosts=h&token=t&fp=\(String(repeating: "a", count: 64))",
        "remotesessions://pair?v=1&id=a&port=1&hosts=&token=t&fp=\(String(repeating: "a", count: 64))",
        "remotesessions://pair?v=1&id=a&port=1&hosts=h&token=t&fp=abc",
        "remotesessions://pair?v=1&id=a&port=0&hosts=h&token=t&fp=\(String(repeating: "a", count: 64))",
    ])
    func rejectsInvalidLinks(text: String) {
        #expect(PairingLink(text) == nil)
    }

    @Test func triesTheLastWorkingHostFirst() {
        var computer = Computer(id: "a", name: "Mac", port: 1, hosts: ["a", "b", "c"], fingerprint: fingerprint)
        computer.lastHost = "b"
        #expect(computer.orderedHosts == ["b", "a", "c"])
    }

    @Test func summarizesTools() {
        #expect(ToolSummary.text(["Read", "Edit", "Read", "Read"]) == "Read ×3, Edit")
    }
}

struct DateDecodingTests {
    struct Box: Decodable { let date: Date }

    @Test(arguments: ["2026-10-10T09:00:00.500+02:00", "2026-10-10T07:00:00.500Z", "2026-10-10T07:00:00.5Z"])
    func honoursTheOffset(text: String) throws {
        let box = try JSONDecoder.api.decode(Box.self, from: Data(#"{"date":"\#(text)"}"#.utf8))
        #expect(box.date.timeIntervalSince1970 == 1_791_615_600.5)
    }
}
