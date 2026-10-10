package com.antonioleiva.remotesessions.data.model

import kotlinx.serialization.Serializable

/** A computer paired through a `remotesessions://pair` URI. */
@Serializable
data class PairedComputer(
    val id: String,
    val name: String,
    val port: Int,
    val hosts: List<String>,
    val token: String,
    val fp: String,
    val lastHost: String? = null,
) {
    /** Hosts to try, the last one that worked first. */
    val orderedHosts: List<String>
        get() = (listOfNotNull(lastHost) + hosts).distinct()
}
