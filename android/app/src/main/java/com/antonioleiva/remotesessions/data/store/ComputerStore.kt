package com.antonioleiva.remotesessions.data.store

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.antonioleiva.remotesessions.data.model.PairedComputer
import com.antonioleiva.remotesessions.data.net.ApiJson
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable

private val Context.dataStore by preferencesDataStore(name = "remote_sessions")

/** What the app remembers between launches. */
data class StoredState(
    val computers: List<PairedComputer> = emptyList(),
    val selectedId: String? = null,
    val demo: Boolean = false,
) {
    val selected: PairedComputer? get() = computers.firstOrNull { it.id == selectedId } ?: computers.firstOrNull()
}

/** Paired computers in DataStore, with each token encrypted by [TokenCipher]. */
class ComputerStore(context: Context, private val cipher: TokenCipher) {
    private val dataStore = context.applicationContext.dataStore

    val state: Flow<StoredState> = dataStore.data.map { prefs ->
        StoredState(
            computers = prefs.computers().map { it.toComputer() },
            selectedId = prefs[SELECTED],
            demo = prefs[DEMO] ?: false,
        )
    }

    /** Adds or replaces (same `id`) a computer and selects it. Leaves demo mode. */
    suspend fun save(computer: PairedComputer) = dataStore.edit { prefs ->
        val stored = StoredComputer.from(computer, cipher.encrypt(computer.token))
        prefs.writeComputers(prefs.computers().filterNot { it.id == computer.id } + stored)
        prefs[SELECTED] = computer.id
        prefs[DEMO] = false
    }

    suspend fun remove(id: String) = dataStore.edit { prefs ->
        prefs.writeComputers(prefs.computers().filterNot { it.id == id })
        if (prefs[SELECTED] == id) prefs.remove(SELECTED)
    }

    suspend fun select(id: String) = dataStore.edit { it[SELECTED] = id }

    suspend fun rememberHost(id: String, host: String, port: Int) = dataStore.edit { prefs ->
        prefs.writeComputers(
            prefs.computers().map { if (it.id == id) it.copy(lastHost = host, port = port) else it },
        )
    }

    suspend fun setDemo(enabled: Boolean) = dataStore.edit { it[DEMO] = enabled }

    private fun Preferences.computers(): List<StoredComputer> =
        this[COMPUTERS]?.let { runCatching { ApiJson.decodeFromString<List<StoredComputer>>(it) }.getOrNull() }.orEmpty()

    private fun androidx.datastore.preferences.core.MutablePreferences.writeComputers(list: List<StoredComputer>) {
        this[COMPUTERS] = ApiJson.encodeToString(list)
    }

    private fun StoredComputer.toComputer() = PairedComputer(
        id = id,
        name = name,
        port = port,
        hosts = hosts,
        // An unreadable token (Keystore reset) makes the server answer 401, which asks to pair again.
        token = cipher.decrypt(encryptedToken).orEmpty(),
        fp = fp,
        lastHost = lastHost,
    )

    @Serializable
    private data class StoredComputer(
        val id: String,
        val name: String,
        val port: Int,
        val hosts: List<String>,
        val encryptedToken: String,
        val fp: String,
        val lastHost: String? = null,
    ) {
        companion object {
            fun from(computer: PairedComputer, encryptedToken: String) = StoredComputer(
                id = computer.id,
                name = computer.name,
                port = computer.port,
                hosts = computer.hosts,
                encryptedToken = encryptedToken,
                fp = computer.fp,
                lastHost = computer.lastHost,
            )
        }
    }

    private companion object {
        val COMPUTERS = stringPreferencesKey("computers")
        val SELECTED = stringPreferencesKey("selected_id")
        val DEMO = booleanPreferencesKey("demo")
    }
}
