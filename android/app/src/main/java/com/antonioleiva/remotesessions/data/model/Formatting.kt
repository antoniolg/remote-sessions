package com.antonioleiva.remotesessions.data.model

import java.time.Instant
import java.time.format.DateTimeParseException

/**
 * Collapses repeated tool names keeping the first-seen order:
 * `["Read", "Read", "Edit", "Read"]` becomes `"Read ×3, Edit"`.
 */
fun toolSummary(tools: List<String>): String {
    val counts = LinkedHashMap<String, Int>()
    tools.forEach { counts[it] = (counts[it] ?: 0) + 1 }
    return counts.entries.joinToString(", ") { (name, count) -> if (count > 1) "$name ×$count" else name }
}

/** Parses an ISO-8601 timestamp (with or without fractional seconds) into epoch millis. */
fun parseTimestamp(text: String): Long? = try {
    Instant.parse(text).toEpochMilli()
} catch (_: DateTimeParseException) {
    null
}
