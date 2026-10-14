package com.antonioleiva.remotesessions.ui.sessions

import com.antonioleiva.remotesessions.ui.common.displayTitle
import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.automirrored.outlined.CallSplit
import androidx.compose.material.icons.outlined.LinkOff
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.rounded.Podcasts
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.data.model.Availability
import com.antonioleiva.remotesessions.data.model.Session
import com.antonioleiva.remotesessions.ui.common.relativeTimeText
import com.antonioleiva.remotesessions.ui.theme.OpenOnComputerOrange
import com.antonioleiva.remotesessions.ui.theme.RunningGreen

@Composable
fun SessionRow(
    session: Session,
    onClick: () -> Unit,
    onConnect: () -> Unit,
    connectEnabled: Boolean,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(start = 16.dp, end = 8.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                session.displayTitle(),
                style = MaterialTheme.typography.titleMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            val prompt = session.lastPrompt
            if (!prompt.isNullOrBlank() && prompt != session.displayTitle()) {
                Text(
                    prompt,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                val meta = MaterialTheme.colorScheme.outline
                session.project?.let {
                    Icon(Icons.Outlined.Folder, contentDescription = null, tint = meta, modifier = Modifier.size(14.dp))
                    Text(it, style = MaterialTheme.typography.labelMedium, color = meta, maxLines = 1)
                    Text("·", style = MaterialTheme.typography.labelMedium, color = meta)
                }
                session.updatedAtMillis?.let {
                    Text(relativeTimeText(it), style = MaterialTheme.typography.labelMedium, color = meta, maxLines = 1)
                }
            }
            AvailabilityLabel(session)
        }
        Spacer(Modifier.width(8.dp))
        when (session.availability) {
            Availability.RemoteControl -> FilledIconButton(onClick = onConnect, enabled = connectEnabled) {
                Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = stringResource(R.string.session_open_in_claude))
            }
            Availability.OpenOnComputer -> FilledTonalIconButton(onClick = onConnect, enabled = connectEnabled) {
                Icon(Icons.AutoMirrored.Outlined.CallSplit, contentDescription = stringResource(R.string.action_relaunch))
            }
            Availability.Closed -> FilledTonalIconButton(onClick = onConnect, enabled = connectEnabled) {
                Icon(Icons.Rounded.Podcasts, contentDescription = stringResource(R.string.session_connect))
            }
        }
    }
}

/** Says whether a conversation has Remote Control or is open on the computer; nothing when closed. */
@Composable
fun AvailabilityLabel(session: Session, modifier: Modifier = Modifier) {
    val (icon, text, color) = when (session.availability) {
        Availability.RemoteControl -> Triple(Icons.Rounded.Podcasts, stringResource(R.string.session_state_remote), RunningGreen)
        Availability.OpenOnComputer -> Triple(Icons.Outlined.LinkOff, stringResource(R.string.session_state_disconnected), OpenOnComputerOrange)
        Availability.Closed -> return
    }
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
        Text(text, style = MaterialTheme.typography.labelMedium, color = color, maxLines = 1)
    }
}
