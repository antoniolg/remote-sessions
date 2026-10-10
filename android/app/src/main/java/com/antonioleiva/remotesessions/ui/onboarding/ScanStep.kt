package com.antonioleiva.remotesessions.ui.onboarding

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.ui.common.UiText
import com.antonioleiva.remotesessions.ui.common.asString
import android.Manifest
import android.content.ClipboardManager
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ContentPaste
import androidx.compose.material.icons.outlined.NoPhotography
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.delay

@Composable
fun ScanStep(error: UiText?, onCode: (String) -> Boolean, onClearError: () -> Unit) {
    val context = LocalContext.current
    var hasCamera by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    var denied by remember { mutableStateOf(false) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasCamera = granted
        denied = !granted
    }
    LaunchedEffect(Unit) { if (!hasCamera) permission.launch(Manifest.permission.CAMERA) }
    var pasting by remember { mutableStateOf(false) }
    // Ignores the same invalid code for a moment so the error does not flicker on every frame.
    var lastRejected by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(lastRejected) {
        if (lastRejected != null) {
            delay(2500)
            lastRejected = null
        }
    }

    StepLayout(
        bottom = {
            OutlinedButton(onClick = { pasting = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.ContentPaste, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text(stringResource(R.string.scan_paste_link))
            }
        },
    ) {
        StepTitle(stringResource(R.string.scan_title), stringResource(R.string.scan_subtitle))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.surfaceContainerHighest),
            contentAlignment = Alignment.Center,
        ) {
            if (hasCamera) {
                QrScanner(
                    onCode = { code ->
                        if (code != lastRejected && !onCode(code)) lastRejected = code
                    },
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(24.dp),
                ) {
                    Icon(Icons.Outlined.NoPhotography, contentDescription = null, modifier = Modifier.size(40.dp))
                    Text(
                        stringResource(if (denied) R.string.scan_camera_denied else R.string.scan_camera_needed),
                        textAlign = TextAlign.Center,
                    )
                    Button(onClick = { permission.launch(Manifest.permission.CAMERA) }) { Text(stringResource(R.string.scan_allow_camera)) }
                }
            }
        }
        if (error != null) {
            Text(error.asString(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
        Text(
            stringResource(R.string.scan_missing_code),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }

    if (pasting) {
        PasteLinkDialog(
            initial = remember { clipboardText(context) },
            onDismiss = { pasting = false },
            onSubmit = { text ->
                onClearError()
                pasting = false
                onCode(text)
            },
        )
    }
}

@Composable
private fun PasteLinkDialog(initial: String, onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.scan_paste_link)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.scan_paste_message))
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("remotesessions://pair?…") },
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = { TextButton(onClick = { onSubmit(text) }, enabled = text.isNotBlank()) { Text(stringResource(R.string.scan_pair)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) } },
    )
}

/** Prefills the dialog when the clipboard already holds a pairing link. */
private fun clipboardText(context: android.content.Context): String {
    val clipboard = context.getSystemService(ClipboardManager::class.java)
    val text = runCatching { clipboard.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString() }.getOrNull()
    return text?.takeIf { it.trim().startsWith("remotesessions://", ignoreCase = true) }.orEmpty()
}
