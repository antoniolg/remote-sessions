package com.antonioleiva.remotesessions.data.net

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.cert.CertificateException
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate

class FingerprintTest {
    /** Self-signed ECDSA P-256 certificate like the ones `remote-sessions` generates. */
    private val pem = """
        -----BEGIN CERTIFICATE-----
        MIIBczCCARigAwIBAgIUMamtwuB4eSA8WNoD71rgPl/G6XYwCgYIKoZIzj0EAwIw
        HzEdMBsGA1UEAwwUcmVtb3RlLXNlc3Npb25zLXRlc3QwHhcNMjYxMDEwMDkwNzE3
        WhcNMzYxMDA3MDkwNzE3WjAfMR0wGwYDVQQDDBRyZW1vdGUtc2Vzc2lvbnMtdGVz
        dDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABF5DP7fH8vgECa57GDlkfekeNok6
        3AtDKuwJRnC5k+lsBzbv6+oEXXelKf6uv7NcoIF8Z8jRJjhFGqcRSPboHBejMjAw
        MB0GA1UdDgQWBBS0AHIl0E7If2Q4so0JEIDr3OfKLzAPBgNVHRMBAf8EBTADAQH/
        MAoGCCqGSM49BAMCA0kAMEYCIQDC5edCAAaNFPsUs+izNV8MKAHvvvKRkzKQCpI6
        Uq9FWAIhAN4YW9rBDn1CY+9OajnZxitPTdubRE4yKzQaRN/S13TQ
        -----END CERTIFICATE-----
    """.trimIndent()

    /** `openssl x509 -in cert.pem -outform DER | shasum -a 256` */
    private val fp = "b32113163cfdf3924de256a2618a66a294af80d17dc38f00964f245409597813"

    private val certificate: X509Certificate =
        CertificateFactory.getInstance("X.509").generateCertificate(pem.byteInputStream()) as X509Certificate

    @Test
    fun sha256HexMatchesKnownVector() {
        assertEquals(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            sha256Hex("abc".toByteArray()),
        )
    }

    @Test
    fun certificateFingerprintMatchesOpenSsl() {
        assertEquals(fp, sha256Hex(certificate.encoded))
        assertTrue(fingerprintMatches(certificate.encoded, fp))
    }

    @Test
    fun matchingToleratesCaseAndColons() {
        assertTrue(fingerprintMatches(certificate.encoded, fp.uppercase()))
        assertTrue(fingerprintMatches(certificate.encoded, fp.chunked(2).joinToString(":")))
    }

    @Test
    fun differentFingerprintDoesNotMatch() {
        assertFalse(fingerprintMatches(certificate.encoded, fp.replaceRange(0, 1, "0")))
        assertFalse(fingerprintMatches(certificate.encoded, ""))
    }

    @Test
    fun trustManagerAcceptsOnlyThePinnedLeaf() {
        PinnedTrustManager(fp).checkServerTrusted(arrayOf(certificate), "ECDHE_ECDSA")
        assertThrows { PinnedTrustManager("0".repeat(64)).checkServerTrusted(arrayOf(certificate), "ECDHE_ECDSA") }
        assertThrows { PinnedTrustManager(fp).checkServerTrusted(emptyArray(), "ECDHE_ECDSA") }
        assertThrows { PinnedTrustManager(fp).checkServerTrusted(null, "ECDHE_ECDSA") }
    }

    private fun assertThrows(block: () -> Unit) {
        try {
            block()
        } catch (_: CertificateException) {
            return
        }
        throw AssertionError("Expected CertificateException")
    }
}
