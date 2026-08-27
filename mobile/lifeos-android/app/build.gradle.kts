// Dependency versions reused verbatim from mobile/whoop-bridge, where each was already
// verified live against Google's Maven repo / Maven Central metadata (not guessed) and
// proven to actually resolve + build together on this machine's toolchain. BLE (Nordic +
// :protocol) was ported in from whoop-bridge — the standalone companion app is retired,
// LifeOS now owns the strap connection directly (see sync/WhoopSyncService.kt).
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.spooky.lifeos.android"
    compileSdk = 37
    compileSdkMinor = 1 // Android's X.Y platform versioning — see whoop-bridge's own build.gradle.kts comment

    defaultConfig {
        applicationId = "com.spooky.lifeos.android"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }

    // 21 (not 17) to match the JDK actually installed — see whoop-bridge's own build.gradle.kts.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    kotlin {
        jvmToolchain(21)
    }

    buildTypes {
        release {
            // Debug-signed for now — sideloaded only, no Play Store signing key to manage.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

dependencies {
    implementation(project(":protocol"))

    // BLE — Nordic Semiconductor's Android-BLE-Library, ported in from whoop-bridge
    // verbatim (same version, same reasoning: just the core `ble` module, not ble-ktx —
    // see sync/BleConnect.kt).
    implementation("no.nordicsemi.android:ble:2.10.1")

    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")

    val composeBom = platform("androidx.compose:compose-bom:2026.08.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    // Domain icons (task/routine/pet/etc., matching lucide-react's set on the web app) —
    // version resolved via the compose-bom platform above, not pinned separately.
    implementation("androidx.compose.material:material-icons-extended")

    // Config (LifeOS URL + device API token) — EncryptedSharedPreferences, same as
    // whoop-bridge's Config.kt.
    implementation("androidx.security:security-crypto:1.1.0")

    // Periodic background refresh of the Today cache.
    implementation("androidx.work:work-runtime-ktx:2.11.2")

    // LifeOS API calls.
    implementation("com.squareup.okhttp3:okhttp:5.5.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")

    // kotlin("test") alone resolves fine for the plain-JVM :protocol module, but this is
    // an Android module — its unit tests run on real JUnit4, and without this explicit
    // bridge kotlin.test.Test doesn't resolve at all (found live in whoop-bridge: "Unresolved
    // reference 'Test'"). kotlin-test-junit maps kotlin.test's annotations/asserts onto JUnit4.
    testImplementation(kotlin("test-junit"))
}
