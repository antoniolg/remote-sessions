package com.antonioleiva.remotesessions.data.net

import com.antonioleiva.remotesessions.data.model.Health
import com.antonioleiva.remotesessions.data.model.MessageList
import com.antonioleiva.remotesessions.data.model.RemoteControlResult
import com.antonioleiva.remotesessions.data.model.SessionList
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Samples from docs/API.md. */
class ApiDecodingTest {
    @Test
    fun decodesHealth() {
        val health = ApiJson.decodeFromString<Health>(
            """{ "ok": true, "id": "4f0c2a8e", "name": "antonio-pro-m5", "version": "0.1.0" }""",
        )
        assertTrue(health.ok)
        assertEquals("4f0c2a8e", health.id)
        assertEquals("antonio-pro-m5", health.name)
        assertEquals("0.1.0", health.version)
    }

    @Test
    fun decodesSessionsWithRunningAndRemote() {
        val json = """
            { "sessions": [ {
              "id": "7663883c-084e-4f27-83a2-0f2ff3ef5fdc",
              "title": "Temas para charla GitHub Copilot",
              "lastPrompt": "es un poco arriesgado esto…",
              "cwd": "/Users/antonio/Documents/Contenido",
              "project": "Contenido",
              "updatedAt": "2026-10-09T16:57:33.296Z",
              "running": { "kind": "interactive", "status": "busy" },
              "remote": { "url": "https://claude.ai/code/session_01abc" },
              "somethingNew": 42
            }, {
              "id": "b",
              "title": "Otra",
              "lastPrompt": null,
              "cwd": null,
              "project": null,
              "updatedAt": "2026-10-09T16:57:33Z",
              "running": null,
              "remote": null
            } ] }
        """.trimIndent()
        val sessions = ApiJson.decodeFromString<SessionList>(json).sessions
        assertEquals(2, sessions.size)
        val first = sessions[0]
        assertEquals("Temas para charla GitHub Copilot", first.title)
        assertEquals("Contenido", first.project)
        assertEquals("interactive", first.running?.kind)
        assertTrue(first.running!!.isBusy)
        assertEquals("https://claude.ai/code/session_01abc", first.remote?.url)
        assertEquals(1_791_565_053_296L, first.updatedAtMillis)

        val second = sessions[1]
        assertNull(second.running)
        assertNull(second.remote)
        assertNull(second.lastPrompt)
        assertEquals(1_791_565_053_000L, second.updatedAtMillis)
    }

    @Test
    fun decodesMessages() {
        val json = """
            { "messages": [
              { "id": "m1", "role": "user", "text": "Arregla el login", "tools": [], "timestamp": "2026-10-09T16:50:00.000Z" },
              { "id": "m2", "role": "assistant", "text": "Hecho.", "tools": ["Read", "Edit"], "timestamp": "2026-10-09T16:51:00.000Z" },
              { "id": "m3", "role": "assistant", "text": "", "tools": ["Bash"], "timestamp": null }
            ] }
        """.trimIndent()
        val messages = ApiJson.decodeFromString<MessageList>(json).messages
        assertEquals(3, messages.size)
        assertTrue(messages[0].isUser)
        assertFalse(messages[1].isUser)
        assertEquals("Read, Edit", messages[1].toolSummary)
        assertNull(messages[2].timestampMillis)
    }

    @Test
    fun decodesRemoteControlResult() {
        val result = ApiJson.decodeFromString<RemoteControlResult>(
            """{ "url": "https://claude.ai/code/session_01xyz", "reused": true }""",
        )
        assertEquals("https://claude.ai/code/session_01xyz", result.url)
        assertTrue(result.reused)
        assertFalse(ApiJson.decodeFromString<RemoteControlResult>("""{ "url": "u" }""").reused)
    }

    @Test
    fun parsesErrorCodeAndServerMessage() {
        val error = ApiClient.parseError(409, """{"error": "Session is open in a terminal", "code": "open_elsewhere"}""")
        assertEquals(409, error.status)
        assertEquals(ApiErrorCode.OPEN_ELSEWHERE, error.code)
        assertEquals("Session is open in a terminal", error.serverMessage)
    }

    @Test
    fun toleratesLegacyAndNonJsonErrorBodies() {
        val legacy = ApiClient.parseError(500, """{"error": "Boom"}""")
        assertNull(legacy.code)
        assertEquals("Boom", legacy.serverMessage)

        val html = ApiClient.parseError(504, "<html>gateway</html>")
        assertEquals(504, html.status)
        assertNull(html.code)
        assertNull(html.serverMessage)
    }
}
