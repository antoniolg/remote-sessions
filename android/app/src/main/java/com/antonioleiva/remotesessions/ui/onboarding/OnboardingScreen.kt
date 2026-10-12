package com.antonioleiva.remotesessions.ui.onboarding

import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.antonioleiva.remotesessions.ui.common.RequestLocalNetworkPermission

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    state: OnboardingUiState,
    viewModel: OnboardingViewModel,
    onExitApp: () -> Unit,
    onPaired: () -> Unit,
) {
    val goBack = {
        if (!viewModel.back()) {
            if (state.fromSettings) viewModel.finish() else onExitApp()
        }
    }
    BackHandler(onBack = goBack)
    val steps = OnboardingStep.entries
    val index = steps.indexOf(state.step)

    Scaffold(
        topBar = {
            if (state.step != OnboardingStep.Welcome) {
                TopAppBar(
                    title = { Text(stringResource(if (state.fromSettings) R.string.onboarding_title_add else R.string.onboarding_title_setup)) },
                    navigationIcon = {
                        val atStart = state.step == OnboardingStep.Install && state.fromSettings
                        IconButton(onClick = goBack) {
                            if (atStart) {
                                Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.action_close))
                            } else {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.action_back))
                            }
                        }
                    },
                )
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            if (state.step != OnboardingStep.Welcome) {
                LinearProgressIndicator(
                    progress = { index.toFloat() / (steps.size - 1) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                )
            }
            AnimatedContent(
                targetState = state.step,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "onboarding-step",
            ) { step ->
                when (step) {
                    OnboardingStep.Welcome -> WelcomeStep(onStart = viewModel::next, onDemo = viewModel::startDemo)
                    OnboardingStep.Install -> InstallStep(state.platform, viewModel::selectPlatform, viewModel::next)
                    OnboardingStep.Scan -> ScanStep(state.scanError, viewModel::onCode, viewModel::clearScanError)
                    OnboardingStep.Tailscale -> TailscaleStep(state.pending?.name, viewModel::next)
                    OnboardingStep.Test -> {
                        // Android 17 asks before reaching the computer; the test runs again once it's allowed.
                        RequestLocalNetworkPermission(enabled = true, onGranted = viewModel::runTest)
                        TestStep(
                            computerName = state.pending?.name.orEmpty(),
                            test = state.test,
                            onRetry = viewModel::runTest,
                            onSaveAnyway = { viewModel.saveAnyway(); onPaired() },
                            onRescan = { viewModel.back() },
                            onDone = { viewModel.finish(); onPaired() },
                        )
                    }
                }
            }
        }
    }
}
