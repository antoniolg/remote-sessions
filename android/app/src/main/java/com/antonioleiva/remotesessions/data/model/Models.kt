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

    val availability: Availability
        get() = when {
            remote != null -> Availability.RemoteControl
            running != null && running.kind != "remote-sessions" -> Availability.OpenOnComputer
            else -> Availability.Closed
        }

    /** Started by Remote Sessions, so it can also stop it. */
    val startedByServer: Boolean get() = running?.kind == "remote-sessions"
}

enum class Availability {
    /** Has Remote Control: opens straight away in the Claude app. */
    RemoteControl,
    /** Open on the computer (terminal or desktop app) without Remote Control: it can't be resumed here. */
    OpenOnComputer,
    /** Closed: Connect resumes it with Remote Control. */
    Closed,
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

/** `POST /v1/sessions`: a new conversation started with Remote Control. */
@Serializable
data class CreatedSession(
    val id: String,
    val url: String,
    val cwd: String,
)

/** `GET /v1/folders`: a folder of the computer and its subfolders. [parent] is null at the home folder. */
@Serializable
data class FolderListing(
    val path: String,
    val parent: String? = null,
    val home: String,
    val folders: List<Folder> = emptyList(),
) {
    val isHome: Boolean get() = path == home
    val name: String get() = path.trimEnd('/', '\\').substringAfterLast('/').substringAfterLast('\\')
}

@Serializable
data class Folder(val name: String, val path: String)

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
