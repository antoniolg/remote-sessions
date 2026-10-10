package com.antonioleiva.remotesessions.data.net

import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.X509TrustManager

/** Lowercase hex SHA-256 of [bytes], no separators. */
fun sha256Hex(bytes: ByteArray): String =
    MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

/** Compares a certificate DER against a paired fingerprint, tolerating case and `:` separators. */
fun fingerprintMatches(certificateDer: ByteArray, expectedFp: String): Boolean {
    val expected = expectedFp.lowercase().replace(":", "")
    val actual = sha256Hex(certificateDer)
    return MessageDigest.isEqual(actual.toByteArray(), expected.toByteArray())
}

/**
 * Trusts exactly one self-signed certificate: the leaf whose DER SHA-256 equals [expectedFp].
 * Chain and hostname validation are intentionally skipped because trust comes from the pin.
 */
class PinnedTrustManager(private val expectedFp: String) : X509TrustManager {
    override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {
        val leaf = chain?.firstOrNull() ?: throw CertificateException("No server certificate")
        if (!fingerprintMatches(leaf.encoded, expectedFp)) {
            throw CertificateException("Server certificate does not match the paired fingerprint")
        }
    }

    override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {
        throw CertificateException("Client certificates are not supported")
    }

    override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
}

/** Accepts any hostname: the pinned fingerprint already identifies the server. */
val AnyHostnameVerifier = HostnameVerifier { _, _ -> true }

fun pinnedSocketFactory(trustManager: X509TrustManager): SSLSocketFactory =
    SSLContext.getInstance("TLS").apply { init(null, arrayOf(trustManager), SecureRandom()) }.socketFactory
