package com.antonioleiva.remotesessions.ui.sessions

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.FilterAlt
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.material.icons.outlined.Laptop
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.data.demo.DemoVideo
import com.antonioleiva.remotesessions.data.model.PairedComputer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionListTopBar(
    computers: List<PairedComputer>,
    selected: PairedComputer?,
    demo: Boolean,
    projects: List<String>,
    project: String?,
    onSelectComputer: (String) -> Unit,
    onSelectProject: (String?) -> Unit,
    onSettings: () -> Unit,
    newSessionEnabled: Boolean,
    onNewSession: () -> Unit,
    scrollBehavior: TopAppBarScrollBehavior,
) {
    TopAppBar(
        scrollBehavior = scrollBehavior,
        title = {
            Column {
                Text(project ?: stringResource(R.string.sessions_title), maxLines = 1, overflow = TextOverflow.Ellipsis)
                ComputerSelector(computers, selected, demo, onSelectComputer)
            }
        },
        actions = {
            IconButton(onClick = onNewSession, enabled = newSessionEnabled) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.new_session_title))
            }
            ProjectFilter(projects, project, onSelectProject)
            IconButton(onClick = onSettings) { Icon(Icons.Outlined.Settings, contentDescription = stringResource(R.string.action_settings)) }
        },
    )
}

@Composable
private fun ComputerSelector(
    computers: List<PairedComputer>,
    selected: PairedComputer?,
    demo: Boolean,
    onSelect: (String) -> Unit,
) {
    val subtitleStyle = MaterialTheme.typography.labelMedium
    val color = MaterialTheme.colorScheme.onSurfaceVariant
    when {
        // The launch video shows a computer name, like a paired computer would, instead of "Demo mode".
        demo -> Text(if (DemoVideo.enabled) "MacBook Pro" else stringResource(R.string.sessions_demo_subtitle), style = subtitleStyle, color = color)
        computers.size <= 1 -> selected?.let { Text(it.name, style = subtitleStyle, color = color, maxLines = 1) }
        else -> {
            var expanded by remember { mutableStateOf(false) }
            Box {
                TextButton(onClick = { expanded = true }, contentPadding = PaddingValues(0.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(selected?.name.orEmpty(), style = subtitleStyle, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Icon(Icons.Filled.ArrowDropDown, contentDescription = stringResource(R.string.sessions_switch_computer))
                    }
                }
                DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    computers.forEach { computer ->
                        DropdownMenuItem(
                            text = { Text(computer.name) },
                            leadingIcon = { Icon(Icons.Outlined.Laptop, contentDescription = null) },
                            trailingIcon = {
                                if (computer.id == selected?.id) Icon(Icons.Filled.Check, contentDescription = stringResource(R.string.sessions_selected))
                            },
                            onClick = {
                                expanded = false
                                onSelect(computer.id)
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProjectFilter(projects: List<String>, project: String?, onSelect: (String?) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { expanded = true }, enabled = projects.isNotEmpty()) {
            Icon(
                if (project == null) Icons.Outlined.FilterAlt else Icons.Filled.FilterAlt,
                contentDescription = stringResource(R.string.sessions_filter_project),
                tint = if (project == null) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.primary,
            )
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.sessions_all_projects)) },
                trailingIcon = { if (project == null) Icon(Icons.Filled.Check, contentDescription = null) },
                onClick = {
                    expanded = false
                    onSelect(null)
                },
            )
            HorizontalDivider()
            projects.forEach { name ->
                DropdownMenuItem(
                    text = { Text(name) },
                    trailingIcon = { if (name == project) Icon(Icons.Filled.Check, contentDescription = null) },
                    onClick = {
                        expanded = false
                        onSelect(name)
                    },
                )
            }
        }
    }
}
