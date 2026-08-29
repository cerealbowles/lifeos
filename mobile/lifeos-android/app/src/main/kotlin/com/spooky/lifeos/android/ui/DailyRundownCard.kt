package com.spooky.lifeos.android.ui

import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.sp

private const val LINK_TAG = "rundown-link"

/**
 * The Daily Rundown's tappable sentence (morning/afternoon/night/recap, see
 * lib/today/rundown.ts) — just the text itself; layout/background is owned by the caller
 * (TodayLanding.kt's TodayLandingSection, which overlays this on the full-bleed hero). Tap
 * targets use the same foreground color as the rest of the sentence, with only a thin
 * underline as the affordance — no accent-color highlighting. An earlier version colored *and*
 * underlined tappable phrases, which read as too attention-grabbing for what's meant to be a
 * calm, editorial read (redesign feedback).
 */
@Composable
fun RundownSentenceText(rundown: DailyRundown, onSegmentClick: (RundownLink) -> Unit) {
    val annotated = rundownAnnotatedString(rundown)
    ClickableText(
        text = annotated,
        style = MaterialTheme.typography.titleMedium.copy(color = LifeosColors.foreground, lineHeight = 30.sp),
        onClick = { offset ->
            annotated.getStringAnnotations(tag = LINK_TAG, start = offset, end = offset)
                .firstOrNull()
                ?.let { onSegmentClick(decodeLink(it.item)) }
        },
    )
}

/** Builds the tappable AnnotatedString by walking `rundown.segments`, matching each
 *  `segment.text` left-to-right from a cursor so repeated substrings resolve to the right
 *  occurrence. Skips a segment gracefully (rather than crashing) if its text isn't found —
 *  guards against server/client wording drift across an app version boundary. */
private fun rundownAnnotatedString(rundown: DailyRundown): AnnotatedString = buildAnnotatedString {
    val text = rundown.sentence
    var cursor = 0
    for (segment in rundown.segments) {
        val start = text.indexOf(segment.text, startIndex = cursor)
        if (start < 0) continue
        append(text.substring(cursor, start))
        pushStringAnnotation(tag = LINK_TAG, annotation = encodeLink(segment.link))
        // Same foreground color as the surrounding text (no accent highlight) — a plain
        // underline is affordance enough, and stays quiet rather than shouting for attention.
        withStyle(SpanStyle(textDecoration = TextDecoration.Underline)) {
            append(segment.text)
        }
        pop()
        cursor = start + segment.text.length
    }
    if (cursor < text.length) append(text.substring(cursor))
}

private fun encodeLink(link: RundownLink): String = "${link.kind}|${link.gameKey ?: ""}"

private fun decodeLink(tag: String): RundownLink {
    val parts = tag.split("|", limit = 2)
    val gameKey = parts.getOrElse(1) { "" }
    return RundownLink(kind = parts.getOrElse(0) { "" }, gameKey = gameKey.ifEmpty { null })
}
