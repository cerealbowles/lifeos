package com.spooky.lifeos.android.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private const val LINK_TAG = "rundown-link"

/**
 * Home screen's tone-shifting narrative (morning/afternoon/night/recap, see
 * lib/today/rundown.ts) — the dominant first thing Home shows, filling the screen below the
 * hero rather than sitting as one card among several (per redesign feedback: the initial card
 * treatment read as "just another list item," undercutting the "one read on your day" intent).
 * Caller sizes this with Modifier.fillParentMaxHeight() from inside the LazyColumn's item{}
 * scope, so this composable itself stays a plain Column, not a Card.
 *
 * Tap targets use the same foreground color as the rest of the sentence, with only a thin
 * underline as the affordance — no accent-color highlighting. An earlier version colored *and*
 * underlined tappable phrases, which read as too attention-grabbing for what's meant to be a
 * calm, editorial read (redesign feedback).
 */
@Composable
fun DailyRundownSection(
    pulse: String,
    nowCount: Int,
    rundown: DailyRundown,
    onSegmentClick: (RundownLink) -> Unit,
    onMoreClick: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize().padding(horizontal = 4.dp)) {
        PulseIndicator(pulse = pulse, nowCount = nowCount)

        Column(modifier = Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.Center) {
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

        if (onMoreClick != null) {
            TextButton(onClick = onMoreClick, modifier = Modifier.fillMaxWidth(), colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = LifeosColors.mutedFg)) {
                Text("More", style = MaterialTheme.typography.labelLarge)
                Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, modifier = Modifier.padding(start = 2.dp))
            }
        }
    }
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
