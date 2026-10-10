package com.antonioleiva.remotesessions.ui.connect

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antonioleiva.remotesessions.AppContainer
import com.antonioleiva.remotesessions.data.model.Session
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

data class ConnectUiState(
    /** The session whose Remote Control is starting; drives the progress overlay. */
    val opening: Session? = null,
    val stopping: Boolean = false,
    @param:StringRes val errorTitle: Int? = null,
    val error: UiText? = null,
    val demoNotice: Boolean = false,
)

/** Asks the computer to resume a session with Remote Control and hands the claude.ai URL to the UI. */
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

    fun connect(session: Session) {
        val source = container.currentSource.value ?: return
        if (source.isDemo) {
            _state.update { it.copy(demoNotice = true) }
            return
        }
        if (_state.value.opening != null) return
        _state.update { it.copy(opening = session) }
        job = viewModelScope.launch {
            try {
                val result = source.startRemoteControl(session.id)
                urls.send(result.url)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                showError(R.string.connect_error_title, e.toUiText())
            } finally {
                _state.update { it.copy(opening = null) }
                _changed.tryEmit(Unit)
            }
        }
    }

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
