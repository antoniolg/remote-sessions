package com.antonioleiva.remotesessions.data.model

import kotlinx.serialization.Serializable

/** A Claude Code conversation as returned by `GET /v1/sessions`. */
@Serializable
data class Session(
    val id: String,
    val title: String,
    val lastPrompt: String? = null,
    val cwd: String? = null,
    val project: String? = null,
    val updatedAt: String,
    val running: Running? = null,
    val remote: Remote? = null,
) {
    val updatedAtMillis: Long? get() = parseTimestamp(updatedAt)
}

@Serializable
data class Running(
    val kind: String,
    val status: String? = null,
) {
    val isBusy: Boolean get() = status == "busy"
}

@Serializable
data class Remote(val url: String)

@Serializable
data class Message(
    val id: String,
    val role: String,
    val text: String = "",
    val tools: List<String> = emptyList(),
    val timestamp: String? = null,
) {
    val isUser: Boolean get() = role == "user"
    val timestampMillis: Long? get() = timestamp?.let(::parseTimestamp)
    val toolSummary: String get() = toolSummary(tools)
}

@Serializable
data class SessionList(val sessions: List<Session>)

@Serializable
data class MessageList(val messages: List<Message>)

@Serializable
data class RemoteControlResult(
    val url: String,
    val reused: Boolean = false,
)

@Serializable
data class Health(
    val ok: Boolean,
    val id: String? = null,
    val name: String? = null,
    val version: String? = null,
)

@Serializable
data class ApiErrorBody(
    val error: String? = null,
    val code: String? = null,
    /** The folder Claude Code asks to trust (`trust_required`). */
    val folder: String? = null,
)
