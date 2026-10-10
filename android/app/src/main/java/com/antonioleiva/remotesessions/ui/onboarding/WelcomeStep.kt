package com.antonioleiva.remotesessions.ui.onboarding

import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.rounded.Podcasts
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.ui.theme.BrandOrange

@Composable
fun WelcomeStep(onStart: () -> Unit, onDemo: () -> Unit) {
    StepLayout(
        bottom = {
            Button(onClick = onStart, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(stringResource(R.string.welcome_start)) }
            TextButton(onClick = onDemo, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.welcome_demo)) }
        },
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .size(112.dp)
                .background(BrandOrange, RoundedCornerShape(28.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Image(painterResource(R.drawable.ic_glyph), contentDescription = null, modifier = Modifier.size(72.dp, 47.dp))
        }
        Spacer(Modifier.height(8.dp))
        Text(
            stringResource(R.string.app_name),
            style = MaterialTheme.typography.headlineMedium,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            stringResource(R.string.welcome_tagline),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        Feature(Icons.Outlined.Forum, stringResource(R.string.welcome_feature_list))
        Feature(Icons.Rounded.Podcasts, stringResource(R.string.welcome_feature_connect))
        Feature(Icons.Outlined.Lock, stringResource(R.string.welcome_feature_secure))
        Spacer(Modifier.height(8.dp))
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh)) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(stringResource(R.string.welcome_requirements_title), style = MaterialTheme.typography.titleSmall)
                Text(
                    listOf(
                        R.string.welcome_requirement_claude_code,
                        R.string.welcome_requirement_subscription,
                        R.string.welcome_requirement_app,
                    ).map { stringResource(it) }.joinToString("\n") { "• $it" },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun Feature(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        Text(text, style = MaterialTheme.typography.bodyMedium)
    }
}
