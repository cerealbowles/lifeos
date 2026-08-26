package com.spooky.lifeos.android.ui

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.spooky.lifeos.android.R

/**
 * "Spectral" (OFL-licensed, bundled as static .ttf under res/font/ — no Google-Fonts-
 * downloadable-fonts runtime dependency, consistent with this app's sideloaded/self-contained
 * posture) for display/heading-tier text, per the design brief's §14 "editorial rather than
 * corporate" typography direction. Only display/title tiers get the serif — body/data/labels
 * keep the system default sans-serif (already in use everywhere), which alone delivers the
 * brief's serif-heading-vs-clean-body contrast without bundling a second family.
 */
private val LifeSerif = FontFamily(
    Font(R.font.spectral_regular, FontWeight.Normal),
    Font(R.font.spectral_medium, FontWeight.Medium),
    Font(R.font.spectral_semibold, FontWeight.SemiBold),
)

private val defaultTypography = Typography()

val LifeTypography = defaultTypography.copy(
    displayLarge = defaultTypography.displayLarge.copy(fontFamily = LifeSerif, fontWeight = FontWeight.SemiBold),
    displayMedium = defaultTypography.displayMedium.copy(fontFamily = LifeSerif, fontWeight = FontWeight.SemiBold),
    displaySmall = defaultTypography.displaySmall.copy(fontFamily = LifeSerif, fontWeight = FontWeight.Medium),
    headlineLarge = defaultTypography.headlineLarge.copy(fontFamily = LifeSerif, fontWeight = FontWeight.SemiBold),
    headlineMedium = defaultTypography.headlineMedium.copy(fontFamily = LifeSerif, fontWeight = FontWeight.Medium),
    headlineSmall = defaultTypography.headlineSmall.copy(fontFamily = LifeSerif, fontWeight = FontWeight.Medium),
    titleLarge = defaultTypography.titleLarge.copy(fontFamily = LifeSerif, fontWeight = FontWeight.SemiBold),
    titleMedium = defaultTypography.titleMedium.copy(fontFamily = LifeSerif, fontWeight = FontWeight.Medium),
)
