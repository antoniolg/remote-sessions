package com.antonioleiva.remotesessions

/** Public links shown in the app. Change them here only. */
object Links {
    const val PROJECT = "https://antonioleiva.com/en/projects/remote-sessions"
    const val PRIVACY = "https://antonioleiva.com/remote-sessions/privacy"
    const val SOURCE = "https://github.com/antoniolg/remote-sessions"
    const val TAILSCALE = "https://tailscale.com/download"
}

/**
 * The one-line server install commands shown during onboarding. Change them here only.
 * [shell] is a program name shown as is; null means the platform's localized "Terminal".
 */
enum class InstallPlatform(val label: String, val shell: String?, val command: String) {
    MacOS(
        label = "macOS",
        shell = null,
        command = "brew install antoniolg/tap/remote-sessions && remote-sessions setup",
    ),
    Windows(
        label = "Windows",
        shell = "PowerShell",
        command = "irm https://antonioleiva.com/remote-sessions/install.ps1 | iex",
    ),
    Linux(
        label = "Linux",
        shell = null,
        command = "curl -fsSL https://antonioleiva.com/remote-sessions/install.sh | sh",
    ),
}
