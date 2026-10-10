package com.antonioleiva.remotesessions.ui.common

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle

/**
 * A small Markdown subset for chat bubbles: **bold**, *italic* / _italic_, `code`, [links](url),
 * fenced code blocks, headings (shown bold) and bullet lists. Anything else stays as plain text.
 */
fun markdownToAnnotatedString(markdown: String, linkColor: Color, codeBackground: Color): AnnotatedString {
    val codeStyle = SpanStyle(fontFamily = FontFamily.Monospace, background = codeBackground)
    val linkStyles = TextLinkStyles(SpanStyle(color = linkColor, textDecoration = TextDecoration.Underline))
    return buildAnnotatedString {
        var inFence = false
        markdown.lines().forEachIndexed { index, rawLine ->
            if (index > 0) append('\n')
            if (rawLine.trimStart().startsWith("```")) {
                inFence = !inFence
                return@forEachIndexed
            }
            if (inFence) {
                withStyle(codeStyle) { append(rawLine) }
                return@forEachIndexed
            }
            val heading = HEADING.find(rawLine)
            val bullet = BULLET.find(rawLine)
            when {
                heading != null -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                    appendInline(rawLine.substring(heading.range.last + 1), codeStyle, linkStyles)
                }
                bullet != null -> {
                    append(bullet.groupValues[1])
                    append("• ")
                    appendInline(rawLine.substring(bullet.range.last + 1), codeStyle, linkStyles)
                }
                else -> appendInline(rawLine, codeStyle, linkStyles)
            }
        }
    }.trimEndNewlines()
}

private val HEADING = Regex("^#{1,6}\\s+")
private val BULLET = Regex("^(\\s*)[-*+]\\s+")

private fun AnnotatedString.Builder.appendInline(text: String, codeStyle: SpanStyle, linkStyles: TextLinkStyles) {
    var i = 0
    while (i < text.length) {
        val c = text[i]
        when {
            c == '`' -> {
                val end = text.indexOf('`', i + 1)
                if (end > i) {
                    withStyle(codeStyle) { append(text.substring(i + 1, end)) }
                    i = end + 1
                    continue
                }
            }
            text.startsWith("**", i) || text.startsWith("__", i) -> {
                val marker = text.substring(i, i + 2)
                val end = text.indexOf(marker, i + 2)
                if (end > i + 2) {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                        appendInline(text.substring(i + 2, end), codeStyle, linkStyles)
                    }
                    i = end + 2
                    continue
                }
            }
            (c == '*' || c == '_') && i + 1 < text.length && !text[i + 1].isWhitespace() &&
                (c == '*' || i == 0 || !text[i - 1].isLetterOrDigit()) -> {
                val end = text.indexOf(c, i + 1)
                if (end > i + 1 && !text[end - 1].isWhitespace()) {
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                        appendInline(text.substring(i + 1, end), codeStyle, linkStyles)
                    }
                    i = end + 1
                    continue
                }
            }
            c == '[' -> {
                val match = LINK.matchAt(text, i)
                if (match != null) {
                    withLink(LinkAnnotation.Url(match.groupValues[2], linkStyles)) { append(match.groupValues[1]) }
                    i = match.range.last + 1
                    continue
                }
            }
        }
        append(c)
        i++
    }
}

private val LINK = Regex("\\[([^\\]]+)]\\((https?://[^)\\s]+)\\)")

private fun AnnotatedString.trimEndNewlines(): AnnotatedString {
    var end = length
    while (end > 0 && text[end - 1] == '\n') end--
    return if (end == length) this else subSequence(0, end)
}
