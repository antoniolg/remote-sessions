package com.antonioleiva.remotesessions.data.pairing

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PairingUriTest {
    private val fp = "b32113163cfdf3924de256a2618a66a294af80d17dc38f00964f245409597813"
    private val valid = "remotesessions://pair?v=1&id=4f0c2a8e-1111-2222-3333-444455556666&name=antonio-pro-m5" +
        "&port=8787&hosts=192.168.1.20,100.101.102.103,antonio-pro.local&token=s3cr3t-T0ken&fp=$fp"

    private fun success(raw: String) = PairingUri.parse(raw) as PairingUri.Result.Success
    private fun failure(raw: String) = PairingUri.parse(raw) as PairingUri.Result.Failure

    @Test
    fun parsesAllFields() {
        val computer = success(valid).computer
        assertEquals("4f0c2a8e-1111-2222-3333-444455556666", computer.id)
        assertEquals("antonio-pro-m5", computer.name)
        assertEquals(8787, computer.port)
        assertEquals(listOf("192.168.1.20", "100.101.102.103", "antonio-pro.local"), computer.hosts)
        assertEquals("s3cr3t-T0ken", computer.token)
        assertEquals(fp, computer.fp)
        assertNull(computer.lastHost)
    }

    @Test
    fun decodesPercentEncodedValues() {
        val raw = valid.replace("name=antonio-pro-m5", "name=Mac%20de%20Antonio%20%C3%B1")
            .replace("hosts=192.168.1.20,", "hosts=192.168.1.20%2C")
        val computer = success(raw).computer
        assertEquals("Mac de Antonio ñ", computer.name)
        assertEquals("192.168.1.20", computer.hosts.first())
        assertEquals(3, computer.hosts.size)
    }

    @Test
    fun acceptsUppercaseFingerprintAndScheme() {
        val raw = valid.replace("remotesessions://", "RemoteSessions://").replace(fp, fp.uppercase())
        assertEquals(fp, success(raw).computer.fp)
    }

    @Test
    fun trimsWhitespaceAndDropsEmptyHosts() {
        val computer = success("  " + valid.replace("hosts=", "hosts=,") + "\n").computer
        assertEquals(3, computer.hosts.size)
    }

    @Test
    fun fallsBackToFirstHostWhenNameIsMissing() {
        val computer = success(valid.replace("&name=antonio-pro-m5", "")).computer
        assertEquals("192.168.1.20", computer.name)
    }

    @Test
    fun rejectsOtherLinks() {
        assertEquals(PairingUri.Error.NotALink, failure("https://example.com/pair?id=1").error)
        assertEquals(PairingUri.Error.NotALink, failure("remotesessions://other?id=1").error)
    }

    @Test
    fun rejectsMissingRequiredFields() {
        listOf("id", "token", "fp", "port", "hosts").forEach { field ->
            val raw = valid.replace(Regex("([?&])$field=[^&]*"), "$1")
            assertEquals(PairingUri.Error.MissingField(field), failure(raw).error)
        }
    }

    @Test
    fun rejectsInvalidFingerprintAndPort() {
        assertEquals(PairingUri.Error.InvalidFingerprint, failure(valid.replace(fp, "abc123")).error)
        failure(valid.replace("port=8787", "port=99999"))
        failure(valid.replace("port=8787", "port=http"))
    }

    @Test
    fun rejectsUnknownVersion() {
        assertEquals(PairingUri.Error.UnsupportedVersion("2"), failure(valid.replace("v=1", "v=2")).error)
    }
}
