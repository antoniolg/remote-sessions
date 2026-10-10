package com.antonioleiva.remotesessions.data.net

import com.antonioleiva.remotesessions.data.model.ApiErrorBody
import com.antonioleiva.remotesessions.data.model.Health
import com.antonioleiva.remotesessions.data.model.Message
import com.antonioleiva.remotesessions.data.model.MessageList
import com.antonioleiva.remotesessions.data.model.RemoteControlResult
import com.antonioleiva.remotesessions.data.model.Session
import com.antonioleiva.remotesessions.data.model.SessionList
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Stable error codes from the server (`code` in the error body). */
object ApiErrorCode {
    const val UNAUTHORIZED = "unauthorized"
    const val NOT_FOUND = "not_found"
    const val OPEN_ELSEWHERE = "open_elsewhere"
    const val REMOTE_CONTROL_TIMEOUT = "remote_control_timeout"
    const val LAUNCH_FAILED = "launch_failed"
    const val INTERNAL = "internal"
}

/**
 * The server answered with a non-2xx status. [code] is the stable error code and [serverMessage]
 * the server's (English) `error` text, both when present.
 */
class ApiException(val status: Int, val code: String?, val serverMessage: String?) :
    Exception("HTTP $status ${code.orEmpty()} ${serverMessage.orEmpty()}".trim())

val ApiJson = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    coerceInputValues = true
}

/** Talks to one host of a paired computer. The [http] client must already pin the certificate. */
class ApiClient(
    private val http: OkHttpClient,
    val host: String,
    private val port: Int,
    private val token: String,
) {
    suspend fun health(): Health = get("health", auth = false, timeoutSeconds = 6)

    suspend fun sessions(): List<Session> = get<SessionList>("v1/sessions", timeoutSeconds = 20).sessions

    suspend fun messages(sessionId: String, limit: Int = 60): List<Message> =
        get<MessageList>("v1/sessions/$sessionId/messages", timeoutSeconds = 20, query = mapOf("limit" to "$limit")).messages

    /** Waits up to ~45 s on the server, so the call timeout is generous. */
    suspend fun startRemoteControl(sessionId: String): RemoteControlResult {
        val request = request("v1/sessions/$sessionId/remote-control")
            .post(ByteArray(0).toRequestBody())
            .build()
        return execute(request, timeoutSeconds = 75) { ApiJson.decodeFromString(it) }
    }

    suspend fun stopRemoteControl(sessionId: String) {
        val request = request("v1/sessions/$sessionId/remote-control").delete().build()
        execute(request, timeoutSeconds = 20) { }
    }

    private suspend inline fun <reified T> get(
        path: String,
        auth: Boolean = true,
        timeoutSeconds: Long,
        query: Map<String, String> = emptyMap(),
    ): T {
        val request = request(path, auth, query).get().build()
        return execute(request, timeoutSeconds) { ApiJson.decodeFromString<T>(it) }
    }

    private fun request(path: String, auth: Boolean = true, query: Map<String, String> = emptyMap()): Request.Builder {
        val url = HttpUrl.Builder()
            .scheme("https")
            .host(host)
            .port(port)
            .addPathSegments(path)
            .apply { query.forEach { (key, value) -> addQueryParameter(key, value) } }
            .build()
        return Request.Builder().url(url).apply {
            if (auth) header("Authorization", "Bearer $token")
            header("Accept", "application/json")
        }
    }

    private suspend fun <T> execute(request: Request, timeoutSeconds: Long, parse: (String) -> T): T {
        val client = http.newBuilder().callTimeout(timeoutSeconds, TimeUnit.SECONDS).build()
        return client.newCall(request).await().use { response ->
            val body = withContext(Dispatchers.IO) { response.body.string() }
            if (!response.isSuccessful) {
                throw parseError(response.code, body)
            }
            parse(body)
        }
    }

    companion object {
        fun parseError(status: Int, body: String): ApiException {
            val parsed = runCatching { ApiJson.decodeFromString<ApiErrorBody>(body) }.getOrNull()
            return ApiException(
                status = status,
                code = parsed?.code?.takeIf { it.isNotBlank() },
                serverMessage = parsed?.error?.takeIf { it.isNotBlank() },
            )
        }
    }
}

/** Suspends until the call completes; cancelling the coroutine cancels the HTTP call. */
suspend fun Call.await(): Response = suspendCancellableCoroutine { continuation ->
    enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            continuation.resume(response) { _, value, _ -> value.close() }
        }

        override fun onFailure(call: Call, e: IOException) {
            continuation.resumeWithException(e)
        }
    })
    continuation.invokeOnCancellation { runCatching { cancel() } }
}
