package com.antonioleiva.remotesessions.ui.onboarding

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.InstallPlatform

@Composable
fun InstallStep(platform: InstallPlatform, onSelect: (InstallPlatform) -> Unit, onNext: () -> Unit) {
    val context = LocalContext.current
    StepLayout(
        bottom = {
            Button(onClick = onNext, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(R.string.install_done)) }
        },
    ) {
        StepTitle(
            stringResource(R.string.install_title),
            stringResource(R.string.install_subtitle),
        )
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
            val options = InstallPlatform.entries
            options.forEachIndexed { index, option ->
                SegmentedButton(
                    selected = option == platform,
                    onClick = { onSelect(option) },
                    shape = SegmentedButtonDefaults.itemShape(index, options.size),
                ) { Text(option.label) }
            }
        }
        Text(stringResource(R.string.install_run_in, platform.shell ?: stringResource(R.string.install_shell_terminal)), style = MaterialTheme.typography.bodyLarge)
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHighest)) {
            SelectionContainer {
                Text(
                    platform.command,
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FilledTonalButton(onClick = { copy(context, platform.command) }, modifier = Modifier.weight(1f)) {
                Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text(stringResource(R.string.install_copy))
            }
            OutlinedButton(
                onClick = { share(context, platform) },
                modifier = Modifier.weight(1f),
                contentPadding = ButtonDefaults.ContentPadding,
            ) {
                Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text(stringResource(R.string.install_share))
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                stringResource(R.string.install_explanation),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (platform == InstallPlatform.MacOS) {
                Text(
                    stringResource(R.string.install_macos_no_brew),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                stringResource(R.string.install_share_hint),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun copy(context: Context, text: String) {
    val clipboard = context.getSystemService(ClipboardManager::class.java)
    clipboard.setPrimaryClip(ClipData.newPlainText("remote-sessions", text))
    // Android 13+ shows its own confirmation.
    if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU) {
        Toast.makeText(context, context.getString(R.string.install_copied), Toast.LENGTH_SHORT).show()
    }
}

private fun share(context: Context, platform: InstallPlatform) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.install_share_subject, platform.label))
        putExtra(Intent.EXTRA_TEXT, platform.command)
    }
    context.startActivity(Intent.createChooser(send, context.getString(R.string.install_share_chooser)))
}
