package com.antonioleiva.remotesessions.ui.sessions

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import androidx.compose.ui.platform.LocalContext
import com.antonioleiva.remotesessions.ui.common.asString
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.SearchOff
import androidx.compose.material.icons.outlined.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.data.model.PairedComputer
import com.antonioleiva.remotesessions.data.model.Session

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionListScreen(
    state: SessionsUiState,
    computers: List<PairedComputer>,
    selected: PairedComputer?,
    demo: Boolean,
    connectEnabled: Boolean,
    onRefresh: () -> Unit,
    onSearch: (String) -> Unit,
    onSelectProject: (String?) -> Unit,
    onSelectComputer: (String) -> Unit,
    onOpen: (Session) -> Unit,
    onConnect: (Session) -> Unit,
    onSettings: () -> Unit,
    onTransientErrorShown: () -> Unit,
) {
    val scrollBehavior = TopAppBarDefaults.pinnedScrollBehavior()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current
    LaunchedEffect(state.transientError) {
        state.transientError?.let {
            snackbar.showSnackbar(it.resolve(context))
            onTransientErrorShown()
        }
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            SessionListTopBar(
                computers = computers,
                selected = selected,
                demo = demo,
                projects = state.projects,
                project = state.project,
                onSelectComputer = onSelectComputer,
                onSelectProject = onSelectProject,
                onSettings = onSettings,
                scrollBehavior = scrollBehavior,
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            SearchField(state.search, onSearch)
            PullToRefreshBox(
                isRefreshing = state.loading && state.sessions.isNotEmpty(),
                onRefresh = onRefresh,
                modifier = Modifier.fillMaxSize(),
            ) {
                when {
                    state.sessions.isEmpty() && state.loading -> Centered {
                        CircularProgressIndicator()
                        Text(stringResource(R.string.sessions_loading), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    state.sessions.isEmpty() && state.loadError != null -> EmptyState(
                        icon = Icons.Outlined.WifiOff,
                        title = stringResource(R.string.sessions_offline_title),
                        message = state.loadError.asString(),
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = onRefresh) { Text(stringResource(R.string.action_retry)) }
                            OutlinedButton(onClick = onSettings) { Text(stringResource(R.string.action_settings)) }
                        }
                    }
                    state.visible.isEmpty() && !state.loading -> EmptyState(
                        icon = Icons.Outlined.SearchOff,
                        title = stringResource(if (state.sessions.isEmpty()) R.string.sessions_empty_title else R.string.sessions_no_results_title),
                        message = stringResource(
                            if (state.sessions.isEmpty()) R.string.sessions_empty_message else R.string.sessions_no_results_message,
                        ),
                    )
                    else -> LazyColumn(Modifier.fillMaxSize()) {
                        items(state.visible, key = { it.id }) { session ->
                            SessionRow(
                                session = session,
                                onClick = { onOpen(session) },
                                onConnect = { onConnect(session) },
                                connectEnabled = connectEnabled,
                            )
                            HorizontalDivider(Modifier.padding(start = 16.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchField(text: String, onChange: (String) -> Unit) {
    TextField(
        value = text,
        onValueChange = onChange,
        placeholder = { Text(stringResource(R.string.sessions_search_hint)) },
        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
        trailingIcon = {
            if (text.isNotEmpty()) {
                IconButton(onClick = { onChange("") }) { Icon(Icons.Filled.Clear, contentDescription = stringResource(R.string.sessions_clear_search)) }
            }
        },
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        shape = CircleShape,
        colors = TextFieldDefaults.colors(
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent,
            disabledIndicatorColor = Color.Transparent,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun Centered(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            content()
        }
    }
}

@Composable
fun EmptyState(icon: ImageVector, title: String, message: String, actions: @Composable () -> Unit = {}) {
    // Scrollable so pull-to-refresh also works on empty states.
    LazyColumn(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        item {
            Column(
                modifier = Modifier.padding(horizontal = 32.dp, vertical = 64.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.outline)
                Text(title, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
                Text(
                    message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                actions()
            }
        }
    }
}
