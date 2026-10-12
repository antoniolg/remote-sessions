package com.antonioleiva.remotesessions.data.demo

import android.content.Context
import androidx.annotation.StringRes
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.data.model.Message
import com.antonioleiva.remotesessions.data.model.Remote
import com.antonioleiva.remotesessions.data.model.Running
import com.antonioleiva.remotesessions.data.model.Session
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Fake conversations whose text comes from string resources (so they follow the app language),
 * with timestamps relative to now so the relative dates look alive.
 */
class DemoData(private val context: Context) {
    private class Turn(@param:StringRes val text: Int, val tools: List<String> = emptyList())

    private class DemoSession(
        val id: String,
        @param:StringRes val title: Int,
        val project: String,
        val minutesAgo: Long,
        val running: Running? = null,
        val conversation: List<Turn>,
    )

    private val all = listOf(
        DemoSession(
            id = "demo-login",
            title = R.string.demo_login_title,
            project = "web-shop",
            minutesAgo = 4,
            running = Running(kind = "interactive", status = "busy"),
            conversation = listOf(
                Turn(R.string.demo_login_1),
                Turn(R.string.demo_login_2, listOf("Grep", "Read", "Read", "Read", "Edit", "Edit")),
                Turn(R.string.demo_login_3),
                Turn(R.string.demo_login_4, listOf("Write", "Bash", "Bash")),
            ),
        ),
        DemoSession(
            id = "demo-newsletter",
            title = R.string.demo_newsletter_title,
            project = "content",
            minutesAgo = 95,
            running = Running(kind = "background", status = "idle"),
            conversation = listOf(
                Turn(R.string.demo_newsletter_1, listOf("Read")),
                Turn(R.string.demo_newsletter_2, listOf("Read", "Read", "Write")),
                Turn(R.string.demo_newsletter_3),
                Turn(R.string.demo_newsletter_4, listOf("Edit")),
            ),
        ),
        DemoSession(
            id = "demo-migration",
            title = R.string.demo_migration_title,
            project = "orders-api",
            minutesAgo = 60 * 26,
            conversation = listOf(
                Turn(R.string.demo_migration_1),
                Turn(R.string.demo_migration_2, listOf("Read", "Grep", "Grep")),
            ),
        ),
        DemoSession(
            id = "demo-android",
            title = R.string.demo_settings_title,
            project = "android-app",
            minutesAgo = 60 * 24 * 3,
            conversation = listOf(
                Turn(R.string.demo_settings_1),
                Turn(R.string.demo_settings_2, listOf("Read", "Write", "Write", "Edit", "Bash")),
            ),
        ),
        DemoSession(
            id = "demo-invoices",
            title = R.string.demo_invoices_title,
            project = "admin",
            minutesAgo = 60 * 24 * 9,
            conversation = listOf(
                Turn(R.string.demo_invoices_1),
                Turn(R.string.demo_invoices_2, listOf("Bash", "Write", "Bash")),
            ),
        ),
    )

    val computerName: String get() = context.getString(R.string.demo_computer_name)

    fun sessions(now: Instant = Instant.now()): List<Session> = all.map { demo ->
        Session(
            id = demo.id,
            title = context.getString(demo.title),
            // The last user prompt, like the real server reports it.
            lastPrompt = demo.conversation.filterIndexed { index, _ -> index % 2 == 0 }.lastOrNull()
                ?.let { context.getString(it.text) },
            cwd = "/Users/demo/Projects/${demo.project}",
            project = demo.project,
            updatedAt = now.minus(demo.minutesAgo, ChronoUnit.MINUTES).toString(),
            running = demo.running,
        ).let { if (DemoVideo.enabled) it.forVideo() else it }
    }

    /** The launch video shows every state: closed, with Remote Control and open on the computer. */
    private fun Session.forVideo(): Session = when (id) {
        "demo-login" -> copy(running = null)
        "demo-newsletter" -> copy(running = null, remote = Remote("https://claude.ai/code"))
        "demo-migration" -> copy(running = Running(kind = "interactive", status = "idle"))
        else -> this
    }

    fun messages(sessionId: String, now: Instant = Instant.now()): List<Message> {
        val demo = all.firstOrNull { it.id == sessionId } ?: return emptyList()
        val count = demo.conversation.size
        return demo.conversation.mapIndexed { index, turn ->
            Message(
                id = "${demo.id}-$index",
                role = if (index % 2 == 0) "user" else "assistant",
                text = context.getString(turn.text),
                tools = turn.tools,
                timestamp = now.minus(demo.minutesAgo + (count - 1 - index) * 3L, ChronoUnit.MINUTES).toString(),
            )
        }
    }
}
