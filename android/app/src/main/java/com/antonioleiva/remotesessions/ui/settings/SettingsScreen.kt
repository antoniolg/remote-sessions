package com.antonioleiva.remotesessions.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Laptop
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Science
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.Links
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.data.model.PairedComputer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    computers: List<PairedComputer>,
    selectedId: String?,
    demo: Boolean,
    versionName: String,
    onBack: () -> Unit,
    onSelect: (String) -> Unit,
    onRemove: (String) -> Unit,
    onAddComputer: () -> Unit,
    onSetDemo: (Boolean) -> Unit,
    onOpenLink: (String) -> Unit,
) {
    var removing by remember { mutableStateOf<PairedComputer?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back))
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize()) {
            item { SectionHeader(stringResource(R.string.settings_computers)) }
            if (computers.isEmpty()) {
                item {
                    ListItem(
                        headlineContent = { Text(stringResource(R.string.settings_no_computers)) },
                        supportingContent = { Text(stringResource(R.string.settings_no_computers_hint)) },
                    )
                }
            }
            items(computers, key = { it.id }) { computer ->
                ComputerItem(
                    computer = computer,
                    selectable = computers.size > 1 && !demo,
                    selected = computer.id == selectedId,
                    onSelect = { onSelect(computer.id) },
                    onRemove = { removing = computer },
                )
            }
            item {
                ListItem(
                    modifier = Modifier.clickable(onClick = onAddComputer),
                    leadingContent = { Icon(Icons.Outlined.Add, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                    headlineContent = { Text(stringResource(R.string.settings_add_computer), color = MaterialTheme.colorScheme.primary) },
                )
            }
            item { HorizontalDivider(Modifier.padding(vertical = 8.dp)) }
            item { SectionHeader(stringResource(R.string.settings_demo_section)) }
            item {
                if (demo) {
                    ListItem(
                        modifier = Modifier.clickable { onSetDemo(false) },
                        leadingContent = { Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null) },
                        headlineContent = { Text(stringResource(R.string.settings_demo_exit)) },
                        supportingContent = {
                            Text(
                                stringResource(
                                    if (computers.isEmpty()) R.string.settings_demo_exit_to_welcome
                                    else R.string.settings_demo_exit_to_computers,
                                ),
                            )
                        },
                    )
                } else {
                    ListItem(
                        modifier = Modifier.clickable { onSetDemo(true) },
                        leadingContent = { Icon(Icons.Outlined.Science, contentDescription = null) },
                        headlineContent = { Text(stringResource(R.string.settings_demo_enter)) },
                        supportingContent = { Text(stringResource(R.string.settings_demo_enter_hint)) },
                    )
                }
            }
            item { HorizontalDivider(Modifier.padding(vertical = 8.dp)) }
            item { SectionHeader(stringResource(R.string.settings_about)) }
            item { LinkItem(Icons.Outlined.Language, stringResource(R.string.settings_project_page)) { onOpenLink(Links.PROJECT) } }
            item { LinkItem(Icons.Outlined.PrivacyTip, stringResource(R.string.settings_privacy)) { onOpenLink(Links.PRIVACY) } }
            item { LinkItem(Icons.Outlined.Code, stringResource(R.string.settings_source)) { onOpenLink(Links.SOURCE) } }
            item {
                ListItem(
                    leadingContent = { Icon(Icons.Outlined.Info, contentDescription = null) },
                    headlineContent = { Text(stringResource(R.string.settings_version, versionName)) },
                    supportingContent = {
                        Text(stringResource(R.string.settings_security) + "\n\n" + stringResource(R.string.settings_disclaimer))
                    },
                )
            }
        }
    }

    removing?.let { computer ->
        AlertDialog(
            onDismissRequest = { removing = null },
            title = { Text(stringResource(R.string.settings_remove_title, computer.name)) },
            text = { Text(stringResource(R.string.settings_remove_message)) },
            confirmButton = {
                TextButton(onClick = {
                    onRemove(computer.id)
                    removing = null
                }) { Text(stringResource(R.string.settings_remove_confirm)) }
            },
            dismissButton = { TextButton(onClick = { removing = null }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }
}

@Composable
private fun ComputerItem(
    computer: PairedComputer,
    selectable: Boolean,
    selected: Boolean,
    onSelect: () -> Unit,
    onRemove: () -> Unit,
) {
    ListItem(
        modifier = Modifier.clickable(enabled = selectable, onClick = onSelect),
        leadingContent = {
            if (selectable) {
                RadioButton(selected = selected, onClick = onSelect)
            } else {
                Icon(Icons.Outlined.Laptop, contentDescription = null)
            }
        },
        headlineContent = { Text(computer.name) },
        supportingContent = {
            val hosts = computer.orderedHosts.joinToString(", ")
            val last = computer.lastHost?.let { stringResource(R.string.settings_last_address, it) + "\n" }.orEmpty()
            Text(last + hosts, maxLines = 3)
        },
        trailingContent = {
            IconButton(onClick = onRemove) {
                Icon(Icons.Outlined.Delete, contentDescription = stringResource(R.string.settings_remove_computer, computer.name))
            }
        },
    )
}

@Composable
private fun LinkItem(icon: ImageVector, text: String, onClick: () -> Unit) {
    ListItem(
        modifier = Modifier.clickable(onClick = onClick),
        leadingContent = { Icon(icon, contentDescription = null) },
        headlineContent = { Text(text) },
    )
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 4.dp),
    )
}
