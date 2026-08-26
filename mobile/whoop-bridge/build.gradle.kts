// Plugin versions pinned to the exact combination already confirmed to build
// successfully against this machine's toolchain (Gradle 9.3.1 / AGP 9.1.0 /
// Kotlin 2.4.0 — captured from the prior Flutter build's generated Android
// project, which built cleanly with `~/Android/Sdk` + the JDK at
// `~/android-tools`, both already installed).
//
// No KSP/Room here on purpose — Room's annotation processor needs a KSP
// plugin version matched exactly to this Kotlin version, and guessing that
// pairing blind (no internet-verifiable compatibility table checked against
// this specific, very new Kotlin release) risks burning a slow Gradle
// resolution failure for no real gain: local storage here is two simple
// tables (raw samples, pending upload batches), well within plain
// SQLiteOpenHelper — no codegen, no extra plugin, one less version to pin.
// org.jetbrains.kotlin.android deliberately absent — AGP 9's built-in Kotlin
// support means applying it errors ("no longer required since AGP 9.0"),
// discovered from Gradle's own error message on the first build attempt.
plugins {
    id("com.android.application") version "9.1.0" apply false
    id("org.jetbrains.kotlin.jvm") version "2.4.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.0" apply false
}
