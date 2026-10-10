package com.antonioleiva.remotesessions.ui.detail

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.ui.common.asString
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.rounded.Podcasts
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.data.model.Session
import com.antonioleiva.remotesessions.ui.sessions.EmptyState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionDetailScreen(
    session: Session,
    state: DetailUiState,
    busy: Boolean,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onConnect: () -> Unit,
    onOpenRemote: () -> Unit,
    onStop: () -> Unit,
) {
    val listState = rememberLazyListState()
    LaunchedEffect(state.messages.lastOrNull()?.id) {
        if (state.messages.isNotEmpty()) listState.scrollToItem(state.messages.lastIndex)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(session.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back)) }
                },
            )
        },
        bottomBar = {
            ConnectBar(session = session, busy = busy, onConnect = onConnect, onOpenRemote = onOpenRemote, onStop = onStop)
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.loading && state.messages.isNotEmpty(),
            onRefresh = onRefresh,
            modifier = Modifier.padding(padding).fillMaxSize(),
        ) {
            when {
                state.messages.isEmpty() && state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                state.messages.isEmpty() && state.error != null -> EmptyState(
                    icon = Icons.Outlined.ErrorOutline,
                    title = stringResource(R.string.detail_load_error_title),
                    message = state.error.asString(),
                ) { Button(onClick = onRefresh) { Text(stringResource(R.string.action_retry)) } }
                state.messages.isEmpty() -> EmptyState(
                    icon = Icons.Outlined.ChatBubbleOutline,
                    title = stringResource(R.string.detail_empty_title),
                    message = stringResource(R.string.detail_empty_message),
                )
                else -> LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(state.messages, key = { it.id }) { MessageBubble(it) }
                }
            }
        }
    }
}

@Composable
private fun ConnectBar(session: Session, busy: Boolean, onConnect: () -> Unit, onOpenRemote: () -> Unit, onStop: () -> Unit) {
    Surface(tonalElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (session.remote != null) {
                Button(onClick = onOpenRemote, enabled = !busy, modifier = Modifier.weight(1f).height(56.dp)) {
                    Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(20.dp))
                    Text(stringResource(R.string.detail_open), modifier = Modifier.padding(start = 8.dp), style = MaterialTheme.typography.titleMedium)
                }
                OutlinedButton(onClick = onStop, enabled = !busy, modifier = Modifier.weight(1f).height(56.dp)) {
                    Icon(Icons.Rounded.Stop, contentDescription = null, modifier = Modifier.size(20.dp))
                    Text(stringResource(R.string.detail_stop), modifier = Modifier.padding(start = 8.dp), style = MaterialTheme.typography.titleMedium)
                }
            } else {
                Button(onClick = onConnect, enabled = !busy, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                    Icon(Icons.Rounded.Podcasts, contentDescription = null, modifier = Modifier.size(20.dp))
                    Text(stringResource(R.string.detail_connect), modifier = Modifier.padding(start = 8.dp), style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
