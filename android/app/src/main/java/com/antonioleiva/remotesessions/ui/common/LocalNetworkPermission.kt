package com.antonioleiva.remotesessions.ui.common

import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat

/** Android 17 (API 37) asks for permission before an app talks to devices on the local network. */
private const val ACCESS_LOCAL_NETWORK = "android.permission.ACCESS_LOCAL_NETWORK"
private const val API_LOCAL_NETWORK = 37

/**
 * Requests the local network permission once when [enabled] and it is missing.
 * [onGranted] runs after the user grants it, to retry what failed without it.
 */
@Composable
fun RequestLocalNetworkPermission(enabled: Boolean, onGranted: () -> Unit) {
    if (Build.VERSION.SDK_INT < API_LOCAL_NETWORK) return
    val context = LocalContext.current
    val currentOnGranted by rememberUpdatedState(onGranted)
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) currentOnGranted()
    }
    LaunchedEffect(enabled) {
        val missing = ContextCompat.checkSelfPermission(context, ACCESS_LOCAL_NETWORK) != PackageManager.PERMISSION_GRANTED
        if (enabled && missing) launcher.launch(ACCESS_LOCAL_NETWORK)
    }
}
