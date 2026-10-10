package com.antonioleiva.remotesessions.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

/** Claude's terracotta, also the app icon background. */
val BrandOrange = Color(0xFFD97757)

/** "Open on the computer" indicator. */
val RunningGreen = Color(0xFF34A853)

private val LightColors = lightColorScheme(
    primary = Color(0xFFA6492C),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFDBD0),
    onPrimaryContainer = Color(0xFF3A0B00),
    secondary = Color(0xFF77574D),
    secondaryContainer = Color(0xFFFFDBD0),
    onSecondaryContainer = Color(0xFF2C160E),
    tertiary = Color(0xFF6C5D2F),
    background = Color(0xFFFFF8F6),
    surface = Color(0xFFFFF8F6),
    surfaceContainer = Color(0xFFFCEAE5),
    surfaceContainerHigh = Color(0xFFF6E4DF),
    surfaceContainerHighest = Color(0xFFF1DFDA),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFFFB59E),
    onPrimary = Color(0xFF5E1702),
    primaryContainer = Color(0xFF842D11),
    onPrimaryContainer = Color(0xFFFFDBD0),
    secondary = Color(0xFFE7BDB1),
    secondaryContainer = Color(0xFF5D4037),
    onSecondaryContainer = Color(0xFFFFDBD0),
    tertiary = Color(0xFFD8C58D),
    background = Color(0xFF1A110F),
    surface = Color(0xFF1A110F),
    surfaceContainer = Color(0xFF271D1A),
    surfaceContainerHigh = Color(0xFF322824),
    surfaceContainerHighest = Color(0xFF3D322F),
)

@Composable
fun RemoteSessionsTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Brand colours by default, like the iOS app and the icon; wallpaper colours would make the app lavender or blue.
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colors = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }
    MaterialTheme(colorScheme = colors, content = content)
}
