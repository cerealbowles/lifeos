// Plugin versions pinned to the exact combination already proven to build on this machine's
// toolchain in mobile/whoop-bridge (Gradle 9.3.1 / AGP 9.1.0 / Kotlin 2.4.0) — no
// org.jetbrains.kotlin.android (AGP 9's built-in Kotlin support errors if it's applied), no
// KSP (see whoop-bridge's own root build.gradle.kts for why: local SQLiteOpenHelper instead
// of Room sidesteps pinning a KSP version to this Kotlin release).
plugins {
    id("com.android.application") version "9.1.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.0" apply false
}
