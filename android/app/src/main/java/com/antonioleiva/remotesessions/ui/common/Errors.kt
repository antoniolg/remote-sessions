package com.antonioleiva.remotesessions.ui.common

import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.data.net.ApiErrorCode
import com.antonioleiva.remotesessions.data.net.ApiException
import com.antonioleiva.remotesessions.data.net.ConnectionException
import com.antonioleiva.remotesessions.data.pairing.PairingUri
import kotlinx.serialization.SerializationException
import java.io.IOException
import java.io.InterruptedIOException

/** A localized message for the user. Server errors use their stable `code`; unknown codes fall back to the server text. */
fun Throwable.toUiText(): UiText = when (this) {
    is ApiException -> when (code) {
        ApiErrorCode.UNAUTHORIZED -> uiText(R.string.error_code_unauthorized)
        ApiErrorCode.NOT_FOUND -> uiText(R.string.error_code_not_found)
        ApiErrorCode.OPEN_ELSEWHERE -> uiText(R.string.error_code_open_elsewhere)
        ApiErrorCode.REMOTE_CONTROL_TIMEOUT -> uiText(R.string.error_code_remote_control_timeout)
        ApiErrorCode.LAUNCH_FAILED -> uiText(R.string.error_code_launch_failed)
        ApiErrorCode.FOLDER_ACCESS -> uiText(R.string.error_code_folder_access)
        ApiErrorCode.PROMPT_BLOCKED -> uiText(R.string.error_code_prompt_blocked)
        ApiErrorCode.OUTSIDE_HOME -> uiText(R.string.error_code_outside_home)
        ApiErrorCode.INTERNAL -> uiText(R.string.error_code_internal)
        else -> serverMessage?.let { UiText.Raw(it) }
            ?: if (status == 401) uiText(R.string.error_code_unauthorized) else uiText(R.string.error_http_status, status)
    }
    is ConnectionException -> when (kind) {
        ConnectionException.Kind.PinMismatch -> uiText(R.string.error_pin_mismatch, computerName)
        ConnectionException.Kind.Unreachable -> uiText(R.string.error_unreachable, computerName)
    }
    is InterruptedIOException -> uiText(R.string.error_timeout)
    is IOException -> uiText(R.string.error_network, localizedMessage ?: javaClass.simpleName)
    is SerializationException -> uiText(R.string.error_bad_response)
    else -> localizedMessage?.let { UiText.Raw(it) } ?: uiText(R.string.error_unexpected)
}

fun PairingUri.Error.toUiText(): UiText = when (this) {
    PairingUri.Error.NotALink -> uiText(R.string.pairing_error_not_a_link)
    is PairingUri.Error.UnsupportedVersion -> uiText(R.string.pairing_error_version, version)
    is PairingUri.Error.MissingField -> uiText(R.string.pairing_error_missing_field, field)
    PairingUri.Error.InvalidFingerprint -> uiText(R.string.pairing_error_fingerprint)
}
