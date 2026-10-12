package com.antonioleiva.remotesessions

import android.app.Application
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

class RemoteSessionsApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        // Applies the user's choice; collection stays off (manifest) until the store is read.
        CoroutineScope(SupervisorJob() + Dispatchers.Default).launch {
            container.state.filterNotNull().map { it.crashReports }.distinctUntilChanged()
                .collect { CrashReports.setEnabled(this@RemoteSessionsApp, it) }
        }
    }
}
