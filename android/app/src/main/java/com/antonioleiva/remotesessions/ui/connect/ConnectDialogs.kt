package com.antonioleiva.remotesessions.ui.connect

import com.antonioleiva.remotesessions.ui.common.displayTitle
import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.data.model.Session
import com.antonioleiva.remotesessions.ui.common.asString
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/** Progress overlay, error dialog and demo notice for [ConnectViewModel]. */
@Composable
fun ConnectDialogs(
    state: ConnectUiState,
    onCancel: () -> Unit,
    onDismissError: () -> Unit,
    onDismissDemo: () -> Unit,
    onPairComputer: () -> Unit,
    onTrust: () -> Unit,
    onDismissTrust: () -> Unit,
    onDismissOpenOnComputer: () -> Unit,
    onRelaunch: (Session) -> Unit,
) {
    state.openOnComputer?.let { session ->
        AlertDialog(
            onDismissRequest = onDismissOpenOnComputer,
            title = { Text(stringResource(R.string.relaunch_title)) },
            text = { Text(stringResource(R.string.relaunch_message)) },
            confirmButton = { TextButton(onClick = { onRelaunch(session) }) { Text(stringResource(R.string.action_relaunch)) } },
            dismissButton = { TextButton(onClick = onDismissOpenOnComputer) { Text(stringResource(R.string.action_cancel)) } },
        )
    }

    state.pendingTrust?.let { pending ->
        AlertDialog(
            onDismissRequest = onDismissTrust,
            title = { Text(stringResource(R.string.trust_title)) },
            text = { Text(stringResource(R.string.trust_message, pending.folder)) },
            confirmButton = { TextButton(onClick = onTrust) { Text(stringResource(R.string.trust_confirm)) } },
            dismissButton = { TextButton(onClick = onDismissTrust) { Text(stringResource(R.string.action_cancel)) } },
        )
    }

    state.opening?.let { launch ->
        Dialog(
            onDismissRequest = {},
            properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false),
        ) {
            Surface(shape = MaterialTheme.shapes.extraLarge, tonalElevation = 6.dp, modifier = Modifier.widthIn(max = 320.dp)) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(40.dp))
                    Text(stringResource(R.string.connect_progress_title), style = MaterialTheme.typography.titleMedium)
                    Text(
                        when (launch) {
                            is Launch.Resume -> launch.session.displayTitle()
                            is Launch.Create -> stringResource(
                                R.string.new_session_progress,
                                launch.title ?: launch.folder.trimEnd('/', '\\').substringAfterLast('/').substringAfterLast('\\'),
                            )
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        stringResource(R.string.connect_progress_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline,
                    )
                    TextButton(onClick = onCancel, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.action_cancel)) }
                }
            }
        }
    }

    if (state.error != null) {
        AlertDialog(
            onDismissRequest = onDismissError,
            title = { Text(stringResource(state.errorTitle ?: R.string.generic_error_title)) },
            text = { Text(state.error.asString()) },
            confirmButton = { TextButton(onClick = onDismissError) { Text(stringResource(R.string.action_ok)) } },
        )
    }

    if (state.demoNotice) {
        AlertDialog(
            onDismissRequest = onDismissDemo,
            title = { Text(stringResource(R.string.demo_dialog_title)) },
            text = {
                Text(stringResource(R.string.demo_dialog_message))
            },
            confirmButton = {
                TextButton(onClick = { onDismissDemo(); onPairComputer() }) { Text(stringResource(R.string.demo_dialog_pair)) }
            },
            dismissButton = { TextButton(onClick = onDismissDemo) { Text(stringResource(R.string.demo_dialog_dismiss)) } },
        )
    }
}
