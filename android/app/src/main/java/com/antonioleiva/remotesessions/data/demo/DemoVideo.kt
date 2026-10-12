package com.antonioleiva.remotesessions.data.demo

/**
 * Launch video (store/video), debug builds only: `adb shell am start -n …/.MainActivity --ez video true`.
 * The demo then shows every conversation state and keeps "Starting Remote Control…" on screen
 * instead of the demo notice.
 */
object DemoVideo {
    var enabled = false
}
