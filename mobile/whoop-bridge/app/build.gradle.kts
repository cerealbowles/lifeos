// Dependency versions verified live against Google's Maven repo / Maven Central
// metadata (maven-metadata.xml `<release>`) rather than guessed from memory —
// same discipline used earlier when vendoring the Dart protocol packages.
// AGP 9's built-in Kotlin support means org.jetbrains.kotlin.android is no longer
// needed (and errors if applied) — discovered from Gradle's own error message on
// the first build attempt, not assumed.
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.spooky.lifeos.whoopbridge"
    // 37, not 36 — the latest verified library versions above (compose 1.12.0,
    // core-ktx 1.19.0, etc.) hard-require compileSdk 37+ (AGP's own
    // checkDebugAarMetadata enforces this, not just a warning). Bumped and
    // platform 37.1 installed rather than downgrading a cascade of
    // interdependent library versions. Android now versions platforms as
    // X.Y (only android-37.0/android-37.1 exist on disk, no bare "android-37")
    // — compileSdkMinor is the AGP DSL property for the minor component,
    // found by inspecting BaseAppModuleExtension's actual bytecode after
    // `compileSdk = 37` alone failed looking for a nonexistent "android-37".
    compileSdk = 37
    compileSdkMinor = 1

    defaultConfig {
        applicationId = "com.spooky.lifeos.whoopbridge"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }

    // 21 (not 17) to match the JDK actually installed — see protocol/build.gradle.kts.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    kotlin {
        jvmToolchain(21)
    }

    buildTypes {
        release {
            // Debug-signed for now — sideloaded only (per the plan's scope),
            // no Play Store distribution/signing key to manage.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

dependencies {
    implementation(project(":protocol"))

    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")

    val composeBom = platform("androidx.compose:compose-bom:2026.08.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    // BLE — real Maven coordinates confirmed via Maven Central search (not
    // guessed): Nordic Semiconductor's Android-BLE-Library, BSD-3-Clause.
    // Just the core `ble` module (BleManager + its classic done/fail/enqueue
    // request API) — deliberately not ble-ktx, whose exact suspend-extension
    // API surface wasn't independently verified; see SyncOrchestrator.kt's
    // hand-written coroutine bridge instead.
    implementation("no.nordicsemi.android:ble:2.10.1")

    // Local storage: plain SQLiteOpenHelper (see root build.gradle.kts comment
    // for why Room/KSP was skipped) — no extra dependency needed beyond the
    // Android framework's own android.database.sqlite.

    // Config: EncryptedSharedPreferences for the LifeOS URL + webhook token.
    implementation("androidx.security:security-crypto:1.1.0")

    // Background sync.
    implementation("androidx.work:work-runtime-ktx:2.11.2")

    // Upload to LifeOS.
    implementation("com.squareup.okhttp3:okhttp:5.5.0")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")

    // kotlin("test") alone resolves fine for the plain-JVM :protocol module, but this is
    // an Android module — its unit tests run on real JUnit4, and without this explicit
    // bridge kotlin.test.Test doesn't resolve at all (found live: "Unresolved reference
    // 'Test'"). kotlin-test-junit maps kotlin.test's annotations/asserts onto real JUnit4.
    testImplementation(kotlin("test-junit"))
}
