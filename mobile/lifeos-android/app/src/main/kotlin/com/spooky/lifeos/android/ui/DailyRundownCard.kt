package com.spooky.lifeos.android.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp

private const val LINK_TAG = "rundown-link"

/**
 * Home screen's tone-shifting narrative card (morning/afternoon/night/recap, see
 * lib/today/rundown.ts). The one genuinely new UI pattern this feature introduces to the
 * Android app: individually tappable phrases inside a paragraph, via AnnotatedString +
 * ClickableText rather than a whole-row `.clickable()`.
 */
@Composable
fun DailyRundownCard(rundown: DailyRundown, onSegmentClick: (RundownLink) -> Unit, onMoreClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = LifeosColors.glassSurface),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, LifeosColors.glassBorder),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            val annotated = rundownAnnotatedString(rundown)
            ClickableText(
                text = annotated,
                style = MaterialTheme.typography.bodyMedium.copy(color = LifeosColors.foreground),
                onClick = { offset ->
                    annotated.getStringAnnotations(tag = LINK_TAG, start = offset, end = offset)
                        .firstOrNull()
                        ?.let { onSegmentClick(decodeLink(it.item)) }
                },
            )
            TextButton(onClick = onMoreClick, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                Text("More", color = LifeosColors.accent)
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
        withStyle(SpanStyle(color = LifeosColors.accent, textDecoration = TextDecoration.Underline)) {
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
