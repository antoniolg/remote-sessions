package com.antonioleiva.remotesessions.ui.common

import android.text.format.DateFormat
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.core.os.ConfigurationCompat
import com.antonioleiva.remotesessions.R
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/** How long ago something happened, bucketed for display. Pure so it can be unit-tested. */
sealed interface RelativeTime {
    data object Now : RelativeTime
    data class Minutes(val count: Int) : RelativeTime
    data class Hours(val count: Int) : RelativeTime
    data object Yesterday : RelativeTime
    data class Days(val count: Int) : RelativeTime
    data class Date(val date: LocalDate, val sameYear: Boolean) : RelativeTime
}

fun relativeTime(millis: Long, nowMillis: Long = System.currentTimeMillis(), zone: ZoneId = ZoneId.systemDefault()): RelativeTime {
    val seconds = (nowMillis - millis) / 1000
    if (seconds < 60) return RelativeTime.Now
    val minutes = seconds / 60
    if (minutes < 60) return RelativeTime.Minutes(minutes.toInt())
    val hours = minutes / 60
    val then = Instant.ofEpochMilli(millis).atZone(zone).toLocalDate()
    val today = Instant.ofEpochMilli(nowMillis).atZone(zone).toLocalDate()
    val days = ChronoUnit.DAYS.between(then, today)
    return when {
        hours < 12 || days == 0L -> RelativeTime.Hours(hours.toInt())
        days == 1L -> RelativeTime.Yesterday
        days < 7 -> RelativeTime.Days(days.toInt())
        else -> RelativeTime.Date(then, sameYear = then.year == today.year)
    }
}

/** Localized short relative date: "5 min ago", "yesterday", "12 Sep"… */
@Composable
fun relativeTimeText(millis: Long): String = when (val time = relativeTime(millis)) {
    RelativeTime.Now -> stringResource(R.string.time_now)
    is RelativeTime.Minutes -> pluralStringResource(R.plurals.time_minutes_ago, time.count, time.count)
    is RelativeTime.Hours -> pluralStringResource(R.plurals.time_hours_ago, time.count, time.count)
    RelativeTime.Yesterday -> stringResource(R.string.time_yesterday)
    is RelativeTime.Days -> pluralStringResource(R.plurals.time_days_ago, time.count, time.count)
    is RelativeTime.Date -> {
        val locale = ConfigurationCompat.getLocales(LocalConfiguration.current)[0] ?: java.util.Locale.getDefault()
        val skeleton = if (time.sameYear) "dMMM" else "dMMMyyyy"
        time.date.format(DateTimeFormatter.ofPattern(DateFormat.getBestDateTimePattern(locale, skeleton), locale))
    }
}
