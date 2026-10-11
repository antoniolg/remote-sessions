package com.antonioleiva.remotesessions.ui.connect

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antonioleiva.remotesessions.AppContainer
import com.antonioleiva.remotesessions.data.model.Session
import com.antonioleiva.remotesessions.data.net.ApiErrorCode
import com.antonioleiva.remotesessions.data.net.ApiException
import androidx.annotation.StringRes
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.ui.common.UiText
import com.antonioleiva.remotesessions.ui.common.toUiText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** What is starting with Remote Control: an existing conversation or a new one in a folder. */
sealed interface Launch {
    data class Resume(val session: Session) : Launch
    data class Create(val folder: String, val title: String?) : Launch
}

data class ConnectUiState(
    /** What is starting; drives the progress overlay. */
    val opening: Launch? = null,
    val stopping: Boolean = false,
    @param:StringRes val errorTitle: Int? = null,
    val error: UiText? = null,
    val demoNotice: Boolean = false,
    /** Claude Code asks whether to trust this session's folder; the user decides. */
    val pendingTrust: PendingTrust? = null,
)

data class PendingTrust(val launch: Launch, val folder: String)

/** Asks the computer to resume or start a session with Remote Control and hands the claude.ai URL to the UI. */
class ConnectViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(ConnectUiState())
    val state: StateFlow<ConnectUiState> = _state.asStateFlow()

    private val urls = Channel<String>(Channel.BUFFERED)
    /** URLs to open with ACTION_VIEW. */
    val urlsToOpen = urls.receiveAsFlow()

    private val _changed = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    /** Emits when a session's Remote Control state probably changed, so lists can refresh. */
    val changed: SharedFlow<Unit> = _changed

    private var job: Job? = null

    fun connect(session: Session) = run(Launch.Resume(session))

    /** Starts a new conversation in [folder] of the computer. */
    fun create(folder: String, title: String?) = run(Launch.Create(folder, title))

    private fun run(launch: Launch, trustFolder: Boolean = false) {
        val source = container.currentSource.value ?: return
        if (source.isDemo) {
            _state.update { it.copy(demoNotice = true) }
            return
        }
        if (_state.value.opening != null) return
        _state.update { it.copy(opening = launch) }
        job = viewModelScope.launch {
            try {
                val url = when (launch) {
                    is Launch.Resume -> source.startRemoteControl(launch.session.id, trustFolder).url
                    is Launch.Create -> source.createSession(launch.folder, launch.title, trustFolder).url
                }
                urls.send(url)
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                if (e.code == ApiErrorCode.TRUST_REQUIRED) {
                    _state.update { it.copy(pendingTrust = PendingTrust(launch, e.folder.orEmpty())) }
                } else {
                    showError(R.string.connect_error_title, e.toUiText())
                }
            } catch (e: Exception) {
                showError(R.string.connect_error_title, e.toUiText())
            } finally {
                _state.update { it.copy(opening = null) }
                _changed.tryEmit(Unit)
            }
        }
    }

    /** The user trusts the folder: connect again answering yes. */
    fun trustAndConnect() {
        val pending = _state.value.pendingTrust ?: return
        _state.update { it.copy(pendingTrust = null) }
        run(pending.launch, trustFolder = true)
    }

    fun dismissTrust() = _state.update { it.copy(pendingTrust = null) }

    fun cancel() {
        job?.cancel()
        _state.update { it.copy(opening = null) }
    }

    fun open(session: Session) {
        val url = session.remote?.url ?: return connect(session)
        urls.trySend(url)
    }

    fun stop(session: Session) {
        val source = container.currentSource.value ?: return
        if (_state.value.stopping) return
        _state.update { it.copy(stopping = true) }
        viewModelScope.launch {
            try {
                source.stopRemoteControl(session.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                showError(R.string.stop_error_title, e.toUiText())
            } finally {
                _state.update { it.copy(stopping = false) }
                _changed.tryEmit(Unit)
            }
        }
    }

    fun showError(@StringRes title: Int, message: UiText) = _state.update { it.copy(errorTitle = title, error = message) }
    fun dismissError() = _state.update { it.copy(errorTitle = null, error = null) }
    fun dismissDemoNotice() = _state.update { it.copy(demoNotice = false) }
}
