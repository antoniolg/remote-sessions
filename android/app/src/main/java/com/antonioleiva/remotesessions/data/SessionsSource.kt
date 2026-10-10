package com.antonioleiva.remotesessions.data

import com.antonioleiva.remotesessions.data.model.Health
import com.antonioleiva.remotesessions.data.model.Message
import com.antonioleiva.remotesessions.data.model.RemoteControlResult
import com.antonioleiva.remotesessions.data.model.Session

/** Where the sessions come from: a paired computer or the bundled demo data. */
interface SessionsSource {
    val key: String
    val isDemo: Boolean

    suspend fun health(): Health
    suspend fun sessions(): List<Session>
    suspend fun messages(sessionId: String): List<Message>
    suspend fun startRemoteControl(sessionId: String): RemoteControlResult
    suspend fun stopRemoteControl(sessionId: String)
}
