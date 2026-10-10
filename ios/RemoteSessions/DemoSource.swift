import Foundation

/// Sample data so the app can be tried (and reviewed) without a computer.
struct DemoSource: SessionSource {
    private static let now = Date()

    private static func ago(_ minutes: Double) -> Date {
        now.addingTimeInterval(-minutes * 60)
    }

    func sessions() async throws -> [Session] {
        [
            Session(id: "demo-1", title: "Arreglar el login con Google", lastPrompt: "Añade un test para el caso de token caducado",
                    cwd: "~/Projects/tienda", project: "tienda", updatedAt: Self.ago(4), running: .init(kind: "interactive", status: "busy"), remote: nil),
            Session(id: "demo-2", title: "Migrar la API a la versión 2", lastPrompt: "Revisa los endpoints que faltan",
                    cwd: "~/Projects/api", project: "api", updatedAt: Self.ago(95), running: nil, remote: nil),
            Session(id: "demo-3", title: "Ideas para la newsletter de octubre", lastPrompt: "Hazme tres titulares más cortos",
                    cwd: "~/Documents/Contenido", project: "Contenido", updatedAt: Self.ago(60 * 26), running: nil, remote: nil),
        ]
    }

    func messages(sessionID: String) async throws -> [Message] {
        [
            Message(id: "m1", role: "user", text: "El login con Google falla cuando el token ha caducado. ¿Lo miras?", tools: [], timestamp: Self.ago(30)),
            Message(id: "m2", role: "assistant", text: "He encontrado el problema: `refreshToken()` no se llama antes de reintentar. Lo he corregido en **AuthService** y ahora la sesión se renueva sola.",
                    tools: ["Read", "Read", "Edit"], timestamp: Self.ago(28)),
            Message(id: "m3", role: "user", text: "Añade un test para el caso de token caducado", tools: [], timestamp: Self.ago(5)),
            Message(id: "m4", role: "assistant", text: "Hecho: `AuthServiceTests.testRefreshesExpiredToken` cubre el caso y pasa junto al resto de la suite.",
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
