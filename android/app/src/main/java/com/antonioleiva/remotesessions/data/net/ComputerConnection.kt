package com.antonioleiva.remotesessions.data.net

import com.antonioleiva.remotesessions.data.SessionsSource
import com.antonioleiva.remotesessions.data.model.Health
import com.antonioleiva.remotesessions.data.model.Message
import com.antonioleiva.remotesessions.data.model.PairedComputer
import com.antonioleiva.remotesessions.data.model.RemoteControlResult
import com.antonioleiva.remotesessions.data.model.Session
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.OkHttpClient
import java.io.IOException
import java.security.cert.CertificateException
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLException

/** None of the computer's addresses answered, or the certificate did not match the pin. */
class ConnectionException(val kind: Kind, val computerName: String, cause: Throwable? = null) :
    IOException("${kind.name}: $computerName", cause) {
    enum class Kind { Unreachable, PinMismatch }
}

/**
 * A [SessionsSource] backed by a paired computer. It finds a host that answers `/health`
 * (last working one first, then the rest, then mDNS), caches it, and reports it through
 * [onHostWorked] so the next launch starts there.
 */
class ComputerConnection(
    private val computer: PairedComputer,
    baseClient: OkHttpClient,
    private val discovery: NsdDiscovery?,
    private val onHostWorked: suspend (host: String, port: Int) -> Unit,
) : SessionsSource {
    override val key: String = "computer:${computer.id}"
    override val isDemo: Boolean = false

    private val http: OkHttpClient = run {
        val trustManager = PinnedTrustManager(computer.fp)
        baseClient.newBuilder()
            .sslSocketFactory(pinnedSocketFactory(trustManager), trustManager)
            .hostnameVerifier(AnyHostnameVerifier)
            .connectTimeout(4, TimeUnit.SECONDS)
            .build()
    }
    private val mutex = Mutex()
    private var cached: ApiClient? = null

    override suspend fun health(): Health = call(retry = true) { it.health() }
    override suspend fun sessions(): List<Session> = call(retry = true) { it.sessions() }
    override suspend fun messages(sessionId: String): List<Message> = call(retry = true) { it.messages(sessionId) }

    // Not retried on another host: the computer may already be starting Remote Control.
    override suspend fun startRemoteControl(sessionId: String): RemoteControlResult =
        call(retry = false) { it.startRemoteControl(sessionId) }

    override suspend fun stopRemoteControl(sessionId: String) = call(retry = false) { it.stopRemoteControl(sessionId) }

    private suspend fun <T> call(retry: Boolean, block: suspend (ApiClient) -> T): T {
        val wasCached = cached != null
        val client = resolve()
        return try {
            block(client)
        } catch (e: ApiException) {
            throw e
        } catch (e: IOException) {
            if (e is ConnectionException) throw e
            mutex.withLock { if (cached === client) cached = null }
            if (retry && wasCached) call(retry = false, block) else throw friendly(e)
        }
    }

    private suspend fun resolve(): ApiClient = mutex.withLock {
        cached?.let { return it }
        var lastError: Throwable? = null
        for (host in computer.orderedHosts) {
            val client = ApiClient(http, host, computer.port, computer.token)
            val error = probe(client) ?: run {
                cached = client
                if (host != computer.lastHost) onHostWorked(host, computer.port)
                return client
            }
            lastError = error
        }
        discovery?.find(computer.id)?.let { found ->
            val client = ApiClient(http, found.host, found.port, computer.token)
            val error = probe(client) ?: run {
                cached = client
                onHostWorked(found.host, found.port)
                return client
            }
            lastError = error
        }
        throw friendly(lastError)
    }

    /** Returns null when the host answers as this computer, or the failure otherwise. */
    private suspend fun probe(client: ApiClient): Throwable? = try {
        val health = client.health()
        if (health.id != null && health.id != computer.id) IOException("Another server at ${client.host}") else null
    } catch (e: IOException) {
        e
    } catch (e: ApiException) {
        e
    } catch (e: kotlinx.serialization.SerializationException) {
        e
    }

    private fun friendly(error: Throwable?): ConnectionException {
        if (error is ConnectionException) return error
        val pinMismatch = generateSequence(error) { it.cause }.any { it is CertificateException } ||
            (error is SSLException && error.message?.contains("certificate", ignoreCase = true) == true)
        val kind = if (pinMismatch) ConnectionException.Kind.PinMismatch else ConnectionException.Kind.Unreachable
        return ConnectionException(kind, computer.name, error)
    }
}
