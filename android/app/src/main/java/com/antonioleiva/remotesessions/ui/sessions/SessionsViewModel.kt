package com.antonioleiva.remotesessions.ui.sessions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antonioleiva.remotesessions.AppContainer
import com.antonioleiva.remotesessions.data.model.Session
import com.antonioleiva.remotesessions.ui.common.UiText
import com.antonioleiva.remotesessions.ui.common.toUiText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SessionsUiState(
    val sessions: List<Session> = emptyList(),
    val loading: Boolean = false,
    val loadError: UiText? = null,
    /** A refresh failed while older results are still shown. */
    val transientError: UiText? = null,
    val search: String = "",
    val project: String? = null,
) {
    val projects: List<String>
        get() = sessions.mapNotNull { it.project }.distinct().sortedWith(String.CASE_INSENSITIVE_ORDER)

    val visible: List<Session>
        get() = sessions.filter { session ->
            (project == null || session.project == project) &&
                (search.isBlank() || listOfNotNull(session.title, session.lastPrompt, session.cwd)
                    .any { it.contains(search.trim(), ignoreCase = true) })
        }
}

class SessionsViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(SessionsUiState())
    val state: StateFlow<SessionsUiState> = _state.asStateFlow()
    private var loadJob: Job? = null

    init {
        viewModelScope.launch {
            container.currentSource.filterNotNull().distinctUntilChangedBy { it.key }.collect {
                _state.value = SessionsUiState()
                refresh()
            }
        }
    }

    fun refresh() {
        val source = container.currentSource.value ?: return
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            try {
                val sessions = source.sessions()
                _state.update { it.copy(sessions = sessions, loading = false, loadError = null) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val message = e.toUiText()
                _state.update {
                    it.copy(
                        loading = false,
                        loadError = message,
                        transientError = if (it.sessions.isNotEmpty()) message else null,
                    )
                }
            }
        }
    }

    fun session(id: String): Session? = _state.value.sessions.firstOrNull { it.id == id }

    fun setSearch(text: String) = _state.update { it.copy(search = text) }
    fun setProject(project: String?) = _state.update { it.copy(project = project) }
    fun clearTransientError() = _state.update { it.copy(transientError = null) }
}
