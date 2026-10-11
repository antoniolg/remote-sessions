package com.antonioleiva.remotesessions.ui.newsession

import com.antonioleiva.remotesessions.data.model.FolderListing
import com.antonioleiva.remotesessions.data.model.Session
import org.junit.Assert.assertEquals
import org.junit.Test

class RecentFoldersTest {
    private fun session(id: String, cwd: String?, updatedAt: String, project: String? = null) =
        Session(id = id, title = id, cwd = cwd, project = project, updatedAt = updatedAt)

    @Test
    fun `lists each folder once, newest first`() {
        val sessions = listOf(
            session("a", "/home/me/api", "2026-10-01T10:00:00Z", "api"),
            session("b", "/home/me/web", "2026-10-03T10:00:00Z"),
            session("c", "/home/me/api", "2026-10-02T10:00:00Z", "api"),
            session("d", null, "2026-10-04T10:00:00Z"),
        )
        assertEquals(
            listOf(RecentFolder("web", "/home/me/web"), RecentFolder("api", "/home/me/api")),
            recentFolders(sessions),
        )
    }

    @Test
    fun `names a listing after its last folder`() {
        assertEquals("web", FolderListing(path = "/home/me/web", home = "/home/me").name)
        assertEquals("api", FolderListing(path = """C:\Users\me\api""", home = """C:\Users\me""").name)
    }
}
