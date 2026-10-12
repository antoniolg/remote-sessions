package com.antonioleiva.remotesessions

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * Crash reports through Firebase Crashlytics: stack traces and device model, never conversations.
 * Builds without google-services.json have no Firebase app, so every call is a no-op there.
 */
object CrashReports {
    fun setEnabled(context: Context, enabled: Boolean) {
        if (FirebaseApp.getApps(context).isEmpty()) return
        FirebaseCrashlytics.getInstance().isCrashlyticsCollectionEnabled = enabled
    }
}
