package com.antonioleiva.remotesessions.data.model

import org.junit.Assert.assertEquals
import org.junit.Test

class ToolSummaryTest {
    @Test
    fun emptyListGivesEmptySummary() = assertEquals("", toolSummary(emptyList()))

    @Test
    fun singleToolHasNoCount() = assertEquals("Edit", toolSummary(listOf("Edit")))

    @Test
    fun repeatedToolsAreCountedInFirstSeenOrder() {
        assertEquals("Read ×3, Edit", toolSummary(listOf("Read", "Read", "Edit", "Read")))
        assertEquals("Grep, Read ×2, Bash ×2", toolSummary(listOf("Grep", "Read", "Bash", "Read", "Bash")))
    }

    @Test
    fun messageExposesItsSummary() {
        val message = Message(id = "1", role = "assistant", text = "Hecho", tools = listOf("Read", "Read", "Edit"))
        assertEquals("Read ×2, Edit", message.toolSummary)
    }
}
