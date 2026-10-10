import Foundation
import Testing

/// Every string in the String Catalogs must be translated into every shipped language.
struct LocalizationTests {
    static let languages = ["es", "fr", "de", "it", "pt-BR", "ja", "ko", "zh-Hans", "zh-Hant", "ru", "nl", "tr", "pl", "id"]

    @Test(arguments: ["Localizable", "InfoPlist"])
    func everyKeyIsTranslated(catalog name: String) throws {
        let catalog = try Catalog(name: name)
        #expect(catalog.sourceLanguage == "en")
        #expect(!catalog.strings.isEmpty)
        for (key, entry) in catalog.strings {
            #expect(entry.extractionState != "stale", "\(name): \"\(key)\" is no longer used")
            for language in Self.languages {
                let unit = entry.localizations?[language]?.stringUnit
                #expect(unit?.state == "translated", "\(name): \"\(key)\" is not translated into \(language)")
                #expect(unit?.value.isEmpty == false, "\(name): \"\(key)\" is empty in \(language)")
            }
        }
    }

    /// Placeholders and inline code (commands) must survive translation unchanged.
    @Test func translationsKeepPlaceholdersAndCommands() throws {
        let catalog = try Catalog(name: "Localizable")
        for (key, entry) in catalog.strings {
            for language in Self.languages {
                guard let value = entry.localizations?[language]?.stringUnit?.value else { continue }
                #expect(value.count(of: "%@") == key.count(of: "%@"), "\"\(key)\" in \(language): placeholders differ")
                #expect(value.inlineCode == key.inlineCode, "\"\(key)\" in \(language): inline code differs")
            }
        }
    }
}

private struct Catalog: Decodable {
    struct Entry: Decodable {
        var extractionState: String?
        var localizations: [String: Localization]?
    }

    struct Localization: Decodable {
        var stringUnit: StringUnit?
    }

    struct StringUnit: Decodable {
        var state: String
        var value: String
    }

    var sourceLanguage: String
    var strings: [String: Entry]

    /// Reads the catalog from the source tree: the app bundle only holds the compiled .strings files.
    init(name: String) throws {
        let url = URL(filePath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appending(path: "RemoteSessions/\(name).xcstrings")
        self = try JSONDecoder().decode(Catalog.self, from: Data(contentsOf: url))
    }
}

private extension String {
    func count(of substring: String) -> Int {
        components(separatedBy: substring).count - 1
    }

    /// The `code spans` in a string, which hold commands that must not be translated.
    var inlineCode: [Substring] {
        matches(of: /`[^`]*`/).map(\.output).sorted()
    }
}
