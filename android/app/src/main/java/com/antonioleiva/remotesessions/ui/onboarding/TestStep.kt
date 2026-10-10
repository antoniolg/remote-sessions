package com.antonioleiva.remotesessions.ui.onboarding

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import androidx.compose.ui.res.pluralStringResource
import com.antonioleiva.remotesessions.ui.common.asString
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.ui.common.RequestLocalNetworkPermission

@Composable
fun TestStep(
    computerName: String,
    test: TestState,
    onRetry: () -> Unit,
    onSaveAnyway: () -> Unit,
    onRescan: () -> Unit,
    onDone: () -> Unit,
) {
    RequestLocalNetworkPermission(enabled = true, onGranted = onRetry)

    StepLayout(
        bottom = {
            when (test) {
                is TestState.Success -> Button(onClick = onDone, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text(stringResource(R.string.test_view_sessions))
                }
                is TestState.Failure -> {
                    Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(R.string.action_retry)) }
                    OutlinedButton(onClick = onSaveAnyway, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.test_save_anyway)) }
                    TextButton(onClick = onRescan, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.test_rescan)) }
                }
                else -> Unit
            }
        },
    ) {
        StepTitle(stringResource(R.string.test_title), stringResource(R.string.test_subtitle, computerName))
        val healthDone = test is TestState.Loading || test is TestState.Success
        CheckLine(
            text = stringResource(R.string.test_server_found),
            state = when {
                healthDone -> LineState.Done
                test is TestState.Failure -> LineState.Failed
                else -> LineState.Running
            },
        )
        CheckLine(
            text = if (test is TestState.Success) {
                pluralStringResource(R.plurals.test_sessions_loaded, test.sessionCount, test.sessionCount)
            } else {
                stringResource(R.string.test_load_sessions)
            },
            state = when (test) {
                is TestState.Success -> LineState.Done
                is TestState.Loading -> LineState.Running
                else -> LineState.Pending
            },
        )
        when (test) {
            is TestState.Success -> Text(
                stringResource(R.string.test_success, test.serverName),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            is TestState.Failure -> {
                Text(test.message.asString(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                Text(
                    stringResource(R.string.test_offline_hint),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            else -> Unit
        }
    }
}

private enum class LineState { Pending, Running, Done, Failed }

@Composable
private fun CheckLine(text: String, state: LineState) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        val iconModifier = Modifier.size(24.dp)
        when (state) {
            LineState.Running -> CircularProgressIndicator(modifier = iconModifier, strokeWidth = 2.5.dp)
            LineState.Done -> Icon(Icons.Filled.CheckCircle, null, iconModifier, tint = MaterialTheme.colorScheme.primary)
            LineState.Failed -> Icon(Icons.Outlined.ErrorOutline, null, iconModifier, tint = MaterialTheme.colorScheme.error)
            LineState.Pending -> Icon(Icons.Outlined.RadioButtonUnchecked, null, iconModifier, tint = MaterialTheme.colorScheme.outline)
        }
        Text(text, style = MaterialTheme.typography.bodyLarge)
    }
}
