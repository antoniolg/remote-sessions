package com.antonioleiva.remotesessions.ui

import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import com.antonioleiva.remotesessions.data.model.Session

sealed interface Screen {
    data object Sessions : Screen
    data class Detail(val session: Session) : Screen
    data object Settings : Screen
}

/** A tiny back stack; onboarding is shown on top of it by [OnboardingViewModel.active]. */
class NavigationViewModel : ViewModel() {
    val backStack = mutableStateListOf<Screen>(Screen.Sessions)

    val current: Screen get() = backStack.last()
    val canGoBack: Boolean get() = backStack.size > 1

    fun push(screen: Screen) {
        backStack.add(screen)
    }

    fun pop() {
        if (canGoBack) backStack.removeAt(backStack.lastIndex)
    }

    fun reset() {
        backStack.clear()
        backStack.add(Screen.Sessions)
    }
}
