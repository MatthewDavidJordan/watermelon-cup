plugins {
    java
    id("org.springframework.boot") version "3.4.5"
    id("io.spring.dependency-management") version "1.1.7"
}

group   = "com.watermeloncup"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories { mavenCentral() }

/* ---------- dependency versions you’re likely to touch ---------- */
val firebaseAdminVersion = "9.+"
val junitLauncherVersion = "1.10.2"
val lombokVersion = "1.18.30"

/* ------------------------------ deps ---------------------------- */
dependencies {
    // Spring
    implementation("org.springframework.boot:spring-boot-starter-websocket")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Firebase
    implementation("com.google.firebase:firebase-admin:$firebaseAdminVersion")

    // Lombok
    compileOnly("org.projectlombok:lombok:$lombokVersion")
    annotationProcessor("org.projectlombok:lombok:$lombokVersion")

    // Dev convenience
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // Tests
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:$junitLauncherVersion")
}

tasks.withType<Test> { useJUnitPlatform() }