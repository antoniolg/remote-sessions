package com.antonioleiva.remotesessions.ui.detail

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Build
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.data.model.Message
import com.antonioleiva.remotesessions.ui.common.markdownToAnnotatedString
import com.antonioleiva.remotesessions.ui.common.relativeTimeText

@Composable
fun MessageBubble(message: Message) {
    val isUser = message.isUser
    val colors = MaterialTheme.colorScheme
    val container = if (isUser) colors.primaryContainer else colors.surfaceContainerHigh
    val content = if (isUser) colors.onPrimaryContainer else colors.onSurface
    val maxWidth = (LocalConfiguration.current.screenWidthDp * 0.85f).dp
    val text = remember(message.text, colors) {
        markdownToAnnotatedString(message.text, linkColor = colors.primary, codeBackground = colors.surfaceVariant)
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            color = container,
            contentColor = content,
            shape = RoundedCornerShape(
                topStart = 18.dp,
                topEnd = 18.dp,
                bottomStart = if (isUser) 18.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 18.dp,
            ),
            modifier = Modifier.widthIn(max = maxWidth),
        ) {
            Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                if (message.text.isNotBlank()) {
                    SelectionContainer { Text(text, style = MaterialTheme.typography.bodyMedium) }
                }
                if (message.tools.isNotEmpty()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Build, contentDescription = stringResource(R.string.detail_tools), modifier = Modifier.size(14.dp), tint = colors.outline)
                        Text(
                            message.toolSummary,
                            style = MaterialTheme.typography.labelMedium,
                            color = colors.onSurfaceVariant,
                            modifier = Modifier.padding(start = 6.dp),
                        )
                    }
                }
                message.timestampMillis?.let {
                    Text(relativeTimeText(it), style = MaterialTheme.typography.labelSmall, color = colors.outline)
                }
            }
        }
    }
}
