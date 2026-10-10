package com.antonioleiva.remotesessions.ui.common

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset

class RelativeTimeTest {
    private val zone = ZoneOffset.UTC
    private val now = LocalDateTime.of(2026, 10, 10, 18, 0).toInstant(zone).toEpochMilli()
    private fun ago(minutes: Long) = relativeTime(now - minutes * 60_000, now, zone)

    @Test
    fun bucketsRecentTimes() {
        assertEquals(RelativeTime.Now, ago(0))
        assertEquals(RelativeTime.Minutes(5), ago(5))
        assertEquals(RelativeTime.Hours(3), ago(180))
    }

    @Test
    fun bucketsDays() {
        assertEquals(RelativeTime.Yesterday, ago(60 * 24))
        assertEquals(RelativeTime.Days(3), ago(60 * 24 * 3))
        assertEquals(RelativeTime.Date(LocalDate.of(2026, 10, 1), sameYear = true), ago(60 * 24 * 9))
        assertEquals(RelativeTime.Date(LocalDate.of(2025, 10, 10), sameYear = false), ago(60 * 24 * 365))
    }
}
