package com.antonioleiva.remotesessions.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.antonioleiva.remotesessions.R
import com.antonioleiva.remotesessions.data.model.Session

/** The server sends an empty title when the conversation has none. */
@Composable
fun Session.displayTitle(): String = title.ifBlank { stringResource(R.string.untitled) }
