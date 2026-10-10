package com.antonioleiva.remotesessions.ui.onboarding

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.Links
import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Public
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri


@Composable
fun TailscaleStep(computerName: String?, onNext: () -> Unit) {
    val context = LocalContext.current
    StepLayout(
        bottom = {
            Button(onClick = onNext, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(R.string.tailscale_test)) }
            OutlinedButton(
                onClick = {
                    try {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Links.TAILSCALE.toUri()))
                    } catch (_: ActivityNotFoundException) {
                        // No browser: nothing else to do.
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.tailscale_download)) }
        },
    ) {
        Icon(Icons.Outlined.Public, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        StepTitle(
            stringResource(R.string.tailscale_title),
            computerName?.let { stringResource(R.string.tailscale_code_read, it) },
        )
        Text(
            stringResource(R.string.tailscale_same_network),
            style = MaterialTheme.typography.bodyLarge,
        )
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Tailscale", style = MaterialTheme.typography.titleMedium)
                Text(
                    stringResource(R.string.tailscale_body),
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    stringResource(R.string.tailscale_repair_hint),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
