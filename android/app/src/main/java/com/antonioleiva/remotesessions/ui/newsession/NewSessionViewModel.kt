package com.antonioleiva.remotesessions.ui.newsession

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antonioleiva.remotesessions.AppContainer
import com.antonioleiva.remotesessions.data.model.FolderListing
import com.antonioleiva.remotesessions.data.model.Session
import com.antonioleiva.remotesessions.ui.common.UiText
import com.antonioleiva.remotesessions.ui.common.toUiText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RecentFolder(val name: String, val path: String)

data class NewSessionUiState(
    val name: String = "",
    /** Browsing the computer's folders instead of showing the recent ones. */
    val browsing: Boolean = false,
    val listing: FolderListing? = null,
    val loading: Boolean = false,
    val error: UiText? = null,
) {
    /** The optional name, or null when blank. */
    val title: String? get() = name.trim().ifEmpty { null }
}

/** The folders of recent conversations, newest first. */
fun recentFolders(sessions: List<Session>, limit: Int = 8): List<RecentFolder> =
    sessions.sortedByDescending { it.updatedAtMillis ?: 0L }
        .mapNotNull { session -> session.cwd?.let { RecentFolder(session.project ?: it.substringAfterLast('/'), it) } }
        .distinctBy { it.path }
        .take(limit)

/** Picks the folder where a new conversation starts. */
class NewSessionViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(NewSessionUiState())
    val state: StateFlow<NewSessionUiState> = _state.asStateFlow()

    /** Folders opened while browsing; null is the home folder. */
    private val stack = ArrayDeque<String?>()
    private var job: Job? = null

    fun setName(name: String) = _state.update { it.copy(name = name) }

    /** Opens [path] (the home folder when null). */
    fun browse(path: String?) {
        stack.addLast(path)
        _state.update { it.copy(browsing = true) }
        load(path)
    }

    /** Goes up one folder; returns false when there is nothing to go back to here. */
    fun back(): Boolean {
        if (!_state.value.browsing) return false
        stack.removeLastOrNull()
        if (stack.isEmpty()) {
            job?.cancel()
            _state.update { it.copy(browsing = false, listing = null, error = null, loading = false) }
        } else {
            load(stack.last())
        }
        return true
    }

    fun retry() {
        if (stack.isNotEmpty()) load(stack.last())
    }

    private fun load(path: String?) {
        val source = container.currentSource.value ?: return
        job?.cancel()
        _state.update { it.copy(loading = true, error = null) }
        job = viewModelScope.launch {
            try {
                val listing = source.folders(path)
                _state.update { it.copy(listing = listing, loading = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(error = e.toUiText(), loading = false) }
            }
        }
    }
}
