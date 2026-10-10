package com.antonioleiva.remotesessions.data.demo

import com.antonioleiva.remotesessions.data.SessionsSource
import com.antonioleiva.remotesessions.data.model.Health
import com.antonioleiva.remotesessions.data.model.Message
import com.antonioleiva.remotesessions.data.model.RemoteControlResult
import com.antonioleiva.remotesessions.data.model.Session
import kotlinx.coroutines.delay

/** Bundled fake data so the app can be explored without a computer (for example, by store reviewers). */
class DemoSessionsSource(private val data: DemoData) : SessionsSource {
    override val key: String = "demo"
    override val isDemo: Boolean = true

    override suspend fun health() = Health(ok = true, id = "demo", name = data.computerName, version = "demo")

    override suspend fun sessions(): List<Session> {
        delay(300)
        return data.sessions()
    }

    override suspend fun messages(sessionId: String): List<Message> {
        delay(250)
        return data.messages(sessionId)
    }

    override suspend fun startRemoteControl(sessionId: String): RemoteControlResult =
        throw UnsupportedOperationException("Remote Control is not available in demo mode")

    override suspend fun stopRemoteControl(sessionId: String) = Unit
}
