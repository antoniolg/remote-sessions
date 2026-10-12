package com.antonioleiva.remotesessions

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.antonioleiva.remotesessions.data.demo.DemoVideo
import com.antonioleiva.remotesessions.data.pairing.PairingUri
import com.antonioleiva.remotesessions.ui.NavigationViewModel
import com.antonioleiva.remotesessions.ui.RemoteSessionsRoot
import com.antonioleiva.remotesessions.ui.connect.ConnectViewModel
import com.antonioleiva.remotesessions.ui.onboarding.OnboardingViewModel
import com.antonioleiva.remotesessions.ui.sessions.SessionsViewModel
import com.antonioleiva.remotesessions.ui.theme.RemoteSessionsTheme
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val container: AppContainer get() = (application as RemoteSessionsApp).container

    private val factory by lazy {
        viewModelFactory {
            initializer { NavigationViewModel() }
            initializer { SessionsViewModel(container) }
            initializer { ConnectViewModel(container) }
            initializer { OnboardingViewModel(container) }
        }
    }
    private val navigation: NavigationViewModel by viewModels { factory }
    private val sessions: SessionsViewModel by viewModels { factory }
    private val connect: ConnectViewModel by viewModels { factory }
    private val onboarding: OnboardingViewModel by viewModels { factory }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0 && intent.getBooleanExtra("video", false)) {
            DemoVideo.enabled = true
        }
        if (savedInstanceState == null) handlePairingLink(intent)
        val versionName = runCatching { packageManager.getPackageInfo(packageName, 0).versionName }.getOrNull().orEmpty()
        setContent {
            RemoteSessionsTheme {
                RemoteSessionsRoot(
                    container = container,
                    navigation = navigation,
                    sessionsViewModel = sessions,
                    connectViewModel = connect,
                    onboardingViewModel = onboarding,
                    versionName = versionName,
                    onExitApp = ::finish,
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handlePairingLink(intent)
    }

    private fun handlePairingLink(intent: Intent?) {
        val link = intent?.data?.takeIf { it.scheme.equals(PairingUri.SCHEME, ignoreCase = true) } ?: return
        lifecycleScope.launch {
            val stored = container.state.filterNotNull().first()
            onboarding.acceptLink(link.toString(), hasComputers = stored.computers.isNotEmpty() || stored.demo)
        }
    }
}
