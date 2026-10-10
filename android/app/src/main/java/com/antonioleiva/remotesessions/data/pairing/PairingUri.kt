package com.antonioleiva.remotesessions.data.pairing

import com.antonioleiva.remotesessions.data.model.PairedComputer
import java.net.URLDecoder

/**
 * Parses `remotesessions://pair?v=1&id=…&name=…&port=8787&hosts=a,b&token=…&fp=<sha256 hex>`.
 * Pure Kotlin so it can be unit-tested without Android.
 */
object PairingUri {
    const val SCHEME = "remotesessions"
    private const val PREFIX = "$SCHEME://pair"
    private val HEX_SHA256 = Regex("^[0-9a-f]{64}$")

    sealed interface Result {
        data class Success(val computer: PairedComputer) : Result
        data class Failure(val error: Error) : Result
    }

    /** Why a link was rejected; the UI turns it into a localized message. */
    sealed interface Error {
        data object NotALink : Error
        data class UnsupportedVersion(val version: String) : Error
        data class MissingField(val field: String) : Error
        data object InvalidFingerprint : Error
    }

    fun parse(raw: String): Result {
        val text = raw.trim()
        if (!text.startsWith(PREFIX, ignoreCase = true)) {
            return Result.Failure(Error.NotALink)
        }
        val query = text.substringAfter('?', missingDelimiterValue = "")
        val params = query.split('&')
            .filter { it.isNotEmpty() }
            .associate { pair ->
                val key = decode(pair.substringBefore('='))
                val value = decode(pair.substringAfter('=', missingDelimiterValue = ""))
                key to value
            }

        val version = params["v"]
        if (version != null && version != "1") {
            return Result.Failure(Error.UnsupportedVersion(version))
        }
        val id = params["id"]?.takeIf { it.isNotBlank() } ?: return missing("id")
        val token = params["token"]?.takeIf { it.isNotBlank() } ?: return missing("token")
        val fp = params["fp"]?.lowercase()?.replace(":", "")?.takeIf { it.isNotBlank() } ?: return missing("fp")
        if (!HEX_SHA256.matches(fp)) return Result.Failure(Error.InvalidFingerprint)
        val port = params["port"]?.toIntOrNull()?.takeIf { it in 1..65535 } ?: return missing("port")
        val hosts = params["hosts"].orEmpty().split(',').map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        if (hosts.isEmpty()) return missing("hosts")
        val name = params["name"]?.takeIf { it.isNotBlank() } ?: hosts.first()

        return Result.Success(
            PairedComputer(id = id, name = name, port = port, hosts = hosts, token = token, fp = fp),
        )
    }

    private fun missing(field: String) = Result.Failure(Error.MissingField(field))

    private fun decode(value: String): String = try {
        URLDecoder.decode(value, "UTF-8")
    } catch (_: IllegalArgumentException) {
        value
    }
}
