package com.antonioleiva.remotesessions.ui.newsession

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.CreateNewFolder
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.FolderOff
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.data.model.FolderListing
import com.antonioleiva.remotesessions.ui.common.asString
import com.antonioleiva.remotesessions.ui.sessions.EmptyState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewSessionScreen(
    state: NewSessionUiState,
    recent: List<RecentFolder>,
    onBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onBrowse: (String?) -> Unit,
    onRetry: () -> Unit,
    onStart: (folder: String) -> Unit,
) {
    val listing = state.listing
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    val title = when {
                        !state.browsing -> stringResource(R.string.new_session_title)
                        listing == null -> ""
                        listing.isHome -> stringResource(R.string.folders_home)
                        else -> listing.name
                    }
                    Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back))
                    }
                },
            )
        },
        bottomBar = {
            if (state.browsing && listing != null && state.error == null) {
                Surface(tonalElevation = 3.dp) {
                    Button(
                        onClick = { onStart(listing.path) },
                        modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp).height(52.dp),
                    ) { Text(stringResource(R.string.folders_start_here)) }
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            if (state.browsing) {
                FolderBrowser(state, listing, onBrowse, onRetry)
            } else {
                Start(state, recent, onNameChange, onBrowse, onStart)
            }
        }
    }
}

@Composable
private fun Start(
    state: NewSessionUiState,
    recent: List<RecentFolder>,
    onNameChange: (String) -> Unit,
    onBrowse: (String?) -> Unit,
    onStart: (String) -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize()) {
        item {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                OutlinedTextField(
                    value = state.name,
                    onValueChange = onNameChange,
                    label = { Text(stringResource(R.string.new_session_name)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(
                    stringResource(R.string.new_session_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
        if (recent.isNotEmpty()) {
            item {
                Text(
                    stringResource(R.string.new_session_recent),
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 4.dp),
                )
            }
            items(recent, key = { it.path }) { folder ->
                ListItem(
                    headlineContent = { Text(folder.name) },
                    supportingContent = { Text(folder.path, maxLines = 1, overflow = TextOverflow.StartEllipsis) },
                    leadingContent = { Icon(Icons.Outlined.Folder, contentDescription = null) },
                    modifier = Modifier.clickable { onStart(folder.path) },
                )
            }
            item { HorizontalDivider(Modifier.padding(vertical = 8.dp)) }
        }
        item {
            ListItem(
                headlineContent = { Text(stringResource(R.string.new_session_browse)) },
                leadingContent = { Icon(Icons.Outlined.CreateNewFolder, contentDescription = null) },
                trailingContent = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null) },
                modifier = Modifier.clickable { onBrowse(null) },
            )
        }
    }
}

@Composable
private fun FolderBrowser(state: NewSessionUiState, listing: FolderListing?, onBrowse: (String?) -> Unit, onRetry: () -> Unit) {
    val error = state.error
    when {
        error != null -> EmptyState(Icons.Outlined.FolderOff, stringResource(R.string.folders_error_title), error.asString()) {
            OutlinedButton(onClick = onRetry) { Text(stringResource(R.string.action_retry)) }
        }
        listing == null || state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        listing.folders.isEmpty() -> Column {
            PathHeader(listing.path)
            EmptyState(Icons.Outlined.Folder, stringResource(R.string.folders_empty_title), stringResource(R.string.folders_empty_message))
        }
        else -> LazyColumn(Modifier.fillMaxSize()) {
            item { PathHeader(listing.path) }
            items(listing.folders, key = { it.path }) { folder ->
                ListItem(
                    headlineContent = { Text(folder.name) },
                    leadingContent = { Icon(Icons.Outlined.Folder, contentDescription = null) },
                    trailingContent = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null) },
                    modifier = Modifier.clickable { onBrowse(folder.path) },
                )
            }
        }
    }
}

@Composable
private fun PathHeader(path: String) {
    Text(
        path,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        maxLines = 1,
        overflow = TextOverflow.StartEllipsis,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
}
