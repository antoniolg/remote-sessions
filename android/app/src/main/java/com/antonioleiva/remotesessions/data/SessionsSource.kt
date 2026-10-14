package com.antonioleiva.remotesessions.data

import com.antonioleiva.remotesessions.data.model.CreatedSession
import com.antonioleiva.remotesessions.data.model.FolderListing
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
    /** [trustFolder] answers yes if Claude Code asks whether to trust the folder (only after the user confirmed). */
    /** [fork] continues a session open elsewhere on the computer in a copy with Remote Control. */
    suspend fun startRemoteControl(sessionId: String, trustFolder: Boolean = false, fork: Boolean = false): RemoteControlResult
    suspend fun stopRemoteControl(sessionId: String)
    /** Subfolders of [path] on the computer (the home folder when null). */
    suspend fun folders(path: String?): FolderListing
    /** Starts a new conversation with Remote Control in [cwd]. */
    suspend fun createSession(cwd: String, title: String?, trustFolder: Boolean = false): CreatedSession
}
