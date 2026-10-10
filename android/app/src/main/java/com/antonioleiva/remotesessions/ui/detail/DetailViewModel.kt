package com.antonioleiva.remotesessions.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.antonioleiva.remotesessions.AppContainer
import com.antonioleiva.remotesessions.data.model.Message
import com.antonioleiva.remotesessions.ui.common.UiText
import com.antonioleiva.remotesessions.ui.common.toUiText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DetailUiState(
    val messages: List<Message> = emptyList(),
    val loading: Boolean = false,
    val error: UiText? = null,
)

class DetailViewModel(private val container: AppContainer, private val sessionId: String) : ViewModel() {
    private val _state = MutableStateFlow(DetailUiState())
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val source = container.currentSource.value ?: return
        viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            try {
                val messages = source.messages(sessionId)
                _state.update { DetailUiState(messages = messages) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = e.toUiText()) }
            }
        }
    }
}
