package com.antonioleiva.remotesessions

import android.content.Context
import com.antonioleiva.remotesessions.data.SessionsSource
import com.antonioleiva.remotesessions.data.demo.DemoData
import com.antonioleiva.remotesessions.data.demo.DemoSessionsSource
import com.antonioleiva.remotesessions.data.model.PairedComputer
import com.antonioleiva.remotesessions.data.net.ComputerConnection
import com.antonioleiva.remotesessions.data.net.NsdDiscovery
import com.antonioleiva.remotesessions.data.store.ComputerStore
import com.antonioleiva.remotesessions.data.store.StoredState
import com.antonioleiva.remotesessions.data.store.TokenCipher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import okhttp3.OkHttpClient

/** Manual dependency container, created once by [RemoteSessionsApp]. */
class AppContainer(context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val baseHttp = OkHttpClient()
    private val discovery = NsdDiscovery(context)
    private val connections = mutableMapOf<PairedComputer, ComputerConnection>()

    val store = ComputerStore(context, TokenCipher())
    val demoSource: SessionsSource = DemoSessionsSource(DemoData(context.applicationContext))

    /** Null until the store has been read for the first time. */
    val state: StateFlow<StoredState?> = store.state.stateIn(scope, SharingStarted.Eagerly, null)

    val currentSource: StateFlow<SessionsSource?> = state
        .map { stored ->
            when {
                stored == null -> null
                stored.demo -> demoSource
                else -> stored.selected?.let(::connectionFor)
            }
        }
        .stateIn(scope, SharingStarted.Eagerly, null)

    /** One connection per computer configuration; a new `lastHost` alone does not replace it. */
    @Synchronized
    fun connectionFor(computer: PairedComputer): ComputerConnection =
        connections.getOrPut(computer.copy(lastHost = null)) {
            ComputerConnection(computer, baseHttp, discovery) { host, port ->
                store.rememberHost(computer.id, host, port)
            }
        }

    /** A connection that is not saved yet, for the onboarding test. [onHostWorked] reports the working host. */
    fun trialConnection(computer: PairedComputer, onHostWorked: (String, Int) -> Unit): ComputerConnection =
        ComputerConnection(computer, baseHttp, discovery) { host, port -> onHostWorked(host, port) }
}
