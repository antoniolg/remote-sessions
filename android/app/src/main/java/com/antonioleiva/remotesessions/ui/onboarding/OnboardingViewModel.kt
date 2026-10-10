package com.antonioleiva.remotesessions.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antonioleiva.remotesessions.AppContainer
import com.antonioleiva.remotesessions.InstallPlatform
import com.antonioleiva.remotesessions.data.model.PairedComputer
import com.antonioleiva.remotesessions.data.pairing.PairingUri
import com.antonioleiva.remotesessions.ui.common.UiText
import com.antonioleiva.remotesessions.ui.common.toUiText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class OnboardingStep { Welcome, Install, Scan, Tailscale, Test }

sealed interface TestState {
    data object Idle : TestState
    data object Checking : TestState
    data class Loading(val serverName: String?) : TestState
    data class Success(val serverName: String, val sessionCount: Int) : TestState
    data class Failure(val message: UiText) : TestState
}

data class OnboardingUiState(
    val active: Boolean = false,
    /** Opened from Settings: it can be closed and has no welcome step. */
    val fromSettings: Boolean = false,
    val step: OnboardingStep = OnboardingStep.Welcome,
    val platform: InstallPlatform = InstallPlatform.MacOS,
    val pending: PairedComputer? = null,
    val scanError: UiText? = null,
    val test: TestState = TestState.Idle,
)

class OnboardingViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(OnboardingUiState())
    val state: StateFlow<OnboardingUiState> = _state.asStateFlow()
    private var testJob: Job? = null

    /** First run: from the welcome screen. */
    fun beginFirstRun() {
        if (_state.value.active) return
        _state.value = OnboardingUiState(active = true)
    }

    /** From Settings → "Add computer" or the demo dialog. */
    fun beginAddComputer() {
        _state.value = OnboardingUiState(active = true, fromSettings = true, step = OnboardingStep.Install)
    }

    /** A `remotesessions://pair` link opened the app: go straight to the connection test. */
    fun acceptLink(raw: String, hasComputers: Boolean) {
        when (val result = PairingUri.parse(raw)) {
            is PairingUri.Result.Success -> {
                _state.value = OnboardingUiState(
                    active = true,
                    fromSettings = hasComputers,
                    step = OnboardingStep.Test,
                    pending = result.computer,
                )
                runTest()
            }
            is PairingUri.Result.Failure -> {
                _state.value = OnboardingUiState(
                    active = true,
                    fromSettings = hasComputers,
                    step = OnboardingStep.Scan,
                    scanError = result.error.toUiText(),
                )
            }
        }
    }

    fun selectPlatform(platform: InstallPlatform) = _state.update { it.copy(platform = platform) }

    fun next() {
        val step = _state.value.step
        val nextStep = when (step) {
            OnboardingStep.Welcome -> OnboardingStep.Install
            OnboardingStep.Install -> OnboardingStep.Scan
            OnboardingStep.Scan -> return
            OnboardingStep.Tailscale -> OnboardingStep.Test
            OnboardingStep.Test -> return
        }
        _state.update { it.copy(step = nextStep) }
        if (nextStep == OnboardingStep.Test) runTest()
    }

    /** Returns false when there is no previous step (the caller closes or leaves the app). */
    fun back(): Boolean {
        val current = _state.value
        val previous = when (current.step) {
            OnboardingStep.Welcome -> null
            OnboardingStep.Install -> if (current.fromSettings) null else OnboardingStep.Welcome
            OnboardingStep.Scan -> OnboardingStep.Install
            OnboardingStep.Tailscale -> OnboardingStep.Scan
            OnboardingStep.Test -> OnboardingStep.Scan
        } ?: return false
        testJob?.cancel()
        _state.update { it.copy(step = previous, test = TestState.Idle, scanError = null) }
        return true
    }

    /** A scanned QR or pasted link. Returns true when it was a valid pairing URI. */
    fun onCode(raw: String): Boolean {
        if (_state.value.step != OnboardingStep.Scan) return false
        return when (val result = PairingUri.parse(raw)) {
            is PairingUri.Result.Success -> {
                _state.update { it.copy(pending = result.computer, scanError = null, step = OnboardingStep.Tailscale) }
                true
            }
            is PairingUri.Result.Failure -> {
                _state.update { it.copy(scanError = result.error.toUiText()) }
                false
            }
        }
    }

    fun clearScanError() = _state.update { it.copy(scanError = null) }

    fun runTest() {
        val computer = _state.value.pending ?: return
        testJob?.cancel()
        testJob = viewModelScope.launch {
            var working: Pair<String, Int>? = null
            val connection = container.trialConnection(computer) { host, port -> working = host to port }
            _state.update { it.copy(test = TestState.Checking) }
            try {
                val health = connection.health()
                _state.update { it.copy(test = TestState.Loading(health.name)) }
                val sessions = connection.sessions()
                val confirmed = computer.copy(
                    name = computer.name.ifBlank { health.name ?: computer.name },
                    lastHost = working?.first,
                    port = working?.second ?: computer.port,
                )
                _state.update {
                    it.copy(pending = confirmed, test = TestState.Success(confirmed.name, sessions.size))
                }
                container.store.save(confirmed)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(test = TestState.Failure(e.toUiText())) }
            }
        }
    }

    /** Keeps the computer even though it did not answer (for example, the phone is away from home). */
    fun saveAnyway() {
        val computer = _state.value.pending ?: return
        viewModelScope.launch {
            container.store.save(computer)
            finish()
        }
    }

    fun startDemo() {
        viewModelScope.launch {
            container.store.setDemo(true)
            finish()
        }
    }

    fun finish() {
        testJob?.cancel()
        _state.value = OnboardingUiState()
    }
}
