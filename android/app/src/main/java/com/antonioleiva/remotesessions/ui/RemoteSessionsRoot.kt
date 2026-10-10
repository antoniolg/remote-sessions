package com.antonioleiva.remotesessions.ui

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.ui.common.uiText
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.net.toUri
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.antonioleiva.remotesessions.AppContainer
import com.antonioleiva.remotesessions.ui.common.RequestLocalNetworkPermission
import com.antonioleiva.remotesessions.ui.connect.ConnectDialogs
import com.antonioleiva.remotesessions.ui.connect.ConnectViewModel
import com.antonioleiva.remotesessions.ui.detail.DetailViewModel
import com.antonioleiva.remotesessions.ui.detail.SessionDetailScreen
import com.antonioleiva.remotesessions.ui.onboarding.OnboardingScreen
import com.antonioleiva.remotesessions.ui.onboarding.OnboardingViewModel
import com.antonioleiva.remotesessions.ui.sessions.SessionListScreen
import com.antonioleiva.remotesessions.ui.sessions.SessionsViewModel
import com.antonioleiva.remotesessions.ui.settings.SettingsScreen
import kotlinx.coroutines.launch

@Composable
fun RemoteSessionsRoot(
    container: AppContainer,
    navigation: NavigationViewModel,
    sessionsViewModel: SessionsViewModel,
    connectViewModel: ConnectViewModel,
    onboardingViewModel: OnboardingViewModel,
    versionName: String,
    onExitApp: () -> Unit,
) {
    val stored by container.state.collectAsStateWithLifecycle()
    val onboarding by onboardingViewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        val current = stored ?: return@Surface
        val needsOnboarding = current.computers.isEmpty() && !current.demo
        LaunchedEffect(needsOnboarding) {
            if (needsOnboarding) {
                navigation.reset()
                onboardingViewModel.beginFirstRun()
            }
        }
        if (onboarding.active) {
            OnboardingScreen(onboarding, onboardingViewModel, onExitApp, onPaired = navigation::reset)
            return@Surface
        }
        if (needsOnboarding) return@Surface

        val sessions by sessionsViewModel.state.collectAsStateWithLifecycle()
        val connect by connectViewModel.state.collectAsStateWithLifecycle()

        LaunchedEffect(Unit) {
            connectViewModel.urlsToOpen.collect { url ->
                if (!openUrl(context, url)) {
                    connectViewModel.showError(R.string.open_error_title, uiText(R.string.open_error_message, url))
                }
            }
        }
        LaunchedEffect(Unit) { connectViewModel.changed.collect { sessionsViewModel.refresh() } }
        RequestLocalNetworkPermission(enabled = !current.demo, onGranted = sessionsViewModel::refresh)
        BackHandler(enabled = navigation.canGoBack) { navigation.pop() }

        when (val screen = navigation.current) {
            Screen.Sessions -> SessionListScreen(
                state = sessions,
                computers = current.computers,
                selected = current.selected,
                demo = current.demo,
                connectEnabled = connect.opening == null,
                onRefresh = sessionsViewModel::refresh,
                onSearch = sessionsViewModel::setSearch,
                onSelectProject = sessionsViewModel::setProject,
                onSelectComputer = { id -> scope.launch { container.store.select(id) } },
                onOpen = { navigation.push(Screen.Detail(it)) },
                onConnect = { if (it.remote != null) connectViewModel.open(it) else connectViewModel.connect(it) },
                onSettings = { navigation.push(Screen.Settings) },
                onTransientErrorShown = sessionsViewModel::clearTransientError,
            )
            is Screen.Detail -> {
                val session = sessionsViewModel.session(screen.session.id).takeIf { sessions.sessions.isNotEmpty() } ?: screen.session
                val sourceKey = container.currentSource.value?.key
                val detail = viewModel(key = "detail:$sourceKey:${session.id}") { DetailViewModel(container, session.id) }
                val detailState by detail.state.collectAsStateWithLifecycle()
                SessionDetailScreen(
                    session = session,
                    state = detailState,
                    busy = connect.opening != null || connect.stopping,
                    onBack = navigation::pop,
                    onRefresh = {
                        detail.refresh()
                        sessionsViewModel.refresh()
                    },
                    onConnect = { connectViewModel.connect(session) },
                    onOpenRemote = { connectViewModel.open(session) },
                    onStop = { connectViewModel.stop(session) },
                )
            }
            Screen.Settings -> SettingsScreen(
                computers = current.computers,
                selectedId = current.selected?.id,
                demo = current.demo,
                versionName = versionName,
                onBack = navigation::pop,
                onSelect = { id -> scope.launch { container.store.select(id) } },
                onRemove = { id -> scope.launch { container.store.remove(id) } },
                onAddComputer = onboardingViewModel::beginAddComputer,
                onOpenLink = { url ->
                    if (!openUrl(context, url)) connectViewModel.showError(R.string.open_error_title, uiText(R.string.open_error_message, url))
                },
                onSetDemo = { enabled ->
                    scope.launch { container.store.setDemo(enabled) }
                    navigation.reset()
                },
            )
        }

        ConnectDialogs(
            state = connect,
            onCancel = connectViewModel::cancel,
            onDismissError = connectViewModel::dismissError,
            onDismissDemo = connectViewModel::dismissDemoNotice,
            onPairComputer = onboardingViewModel::beginAddComputer,
        )
    }
}

/** Opens a URL; the Claude app claims claude.ai links as app links, otherwise the browser opens them. */
private fun openUrl(context: Context, url: String): Boolean = try {
    context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri()).addCategory(Intent.CATEGORY_BROWSABLE))
    true
} catch (_: ActivityNotFoundException) {
    false
}
