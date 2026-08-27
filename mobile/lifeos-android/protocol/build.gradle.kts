// Pure Kotlin/JVM module — mirrors OpenStrap/protocol's own "PURE Dart — no
// Flutter, no I/O" framing for the same reason: this is the byte-exact,
// hand-ported WHOOP BLE protocol layer, and it should compile/test in plain
// `kotlinc`/JUnit with zero Android dependency, exactly like the original
// Dart package's own test suite does.
plugins {
    kotlin("jvm")
}

// Targets 21 (not 17) to match the JDK actually installed at
// ~/android-tools/jdk-21.0.12.1+1 — jvmToolchain(17) would ask Gradle to
// auto-provision a different JDK, which fails with no toolchain download
// repository configured. Discovered from Gradle's own error, not assumed.
java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
