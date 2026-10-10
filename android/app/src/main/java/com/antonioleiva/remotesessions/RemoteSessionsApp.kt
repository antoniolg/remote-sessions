package com.antonioleiva.remotesessions

import android.app.Application

class RemoteSessionsApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
