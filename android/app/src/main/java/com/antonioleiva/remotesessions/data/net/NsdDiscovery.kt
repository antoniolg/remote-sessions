package com.antonioleiva.remotesessions.data.net

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withTimeoutOrNull
import java.net.Inet6Address
import java.net.InetAddress
import java.util.concurrent.Executors

/**
 * Finds a paired computer on the local network through mDNS (`_remotesessions._tcp`),
 * matching the TXT record `id`. Used only when every stored host fails.
 */
class NsdDiscovery(context: Context) {
    private val nsd = context.applicationContext.getSystemService(NsdManager::class.java)
    private val executor = Executors.newSingleThreadExecutor()

    data class Found(val host: String, val port: Int)

    suspend fun find(serverId: String, timeoutMillis: Long = 5_000): Found? =
        withTimeoutOrNull(timeoutMillis) { discover(serverId).firstOrNull() }

    private fun discover(serverId: String) = callbackFlow {
        val listener = object : NsdManager.DiscoveryListener {
            override fun onServiceFound(info: NsdServiceInfo) {
                resolve(info) { resolved ->
                    val id = resolved.attributes["id"]?.toString(Charsets.UTF_8)
                    val address = resolved.addresses().firstOrNull()
                    if (id == serverId && address != null) {
                        trySend(Found(address.toHostString(), resolved.port))
                    }
                }
            }

            override fun onDiscoveryStarted(serviceType: String) = Unit
            override fun onDiscoveryStopped(serviceType: String) = Unit
            override fun onServiceLost(info: NsdServiceInfo) = Unit
            override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                close()
            }

            override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) = Unit
        }
        runCatching { nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, listener) }
            .onFailure { close(it) }
        awaitClose { runCatching { nsd.stopServiceDiscovery(listener) } }
    }

    private fun resolve(info: NsdServiceInfo, onResolved: (NsdServiceInfo) -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val callback = object : NsdManager.ServiceInfoCallback {
                override fun onServiceUpdated(serviceInfo: NsdServiceInfo) {
                    // The first update can arrive before any address is known.
                    if (serviceInfo.hostAddresses.isEmpty()) return
                    onResolved(serviceInfo)
                    runCatching { nsd.unregisterServiceInfoCallback(this) }
                }

                override fun onServiceInfoCallbackRegistrationFailed(errorCode: Int) = Unit
                override fun onServiceLost() = Unit
                override fun onServiceInfoCallbackUnregistered() = Unit
            }
            runCatching { nsd.registerServiceInfoCallback(info, executor, callback) }
        } else {
            @Suppress("DEPRECATION")
            nsd.resolveService(info, object : NsdManager.ResolveListener {
                override fun onServiceResolved(serviceInfo: NsdServiceInfo) = onResolved(serviceInfo)
                override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit
            })
        }
    }

    private fun NsdServiceInfo.addresses(): List<InetAddress> {
        val all = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            hostAddresses
        } else {
            @Suppress("DEPRECATION")
            listOfNotNull(host)
        }
        // Prefer IPv4: link-local IPv6 addresses need a scope id that URLs handle poorly.
        return all.sortedBy { if (it is Inet6Address) 1 else 0 }
    }

    private fun InetAddress.toHostString(): String = hostAddress?.substringBefore('%') ?: hostName

    companion object {
        const val SERVICE_TYPE = "_remotesessions._tcp"
    }
}
