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
val firebaseAdminVersion = "9.1.1"
val junitLauncherVersion = "1.10.2"
val lombokVersion = "1.18.30"
val googleApiClientVersion = "2.2.0"
val googleSheetsVersion = "v4-rev20230227-2.0.0"
val googleAuthVersion = "1.19.0"

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

    // Google Sheets API - using Firebase service account
    implementation("com.google.api-client:google-api-client:$googleApiClientVersion")
    implementation("com.google.apis:google-api-services-sheets:$googleSheetsVersion")
    implementation("com.google.auth:google-auth-library-oauth2-http:$googleAuthVersion")
    implementation("com.google.auth:google-auth-library-credentials:$googleAuthVersion")
    implementation("com.google.http-client:google-http-client-gson:1.43.3")
    implementation("com.google.oauth-client:google-oauth-client:1.34.1")
    
    // Firebase already includes the necessary Google Auth dependencies

    // Tests
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:$junitLauncherVersion")
}

tasks.withType<Test> { useJUnitPlatform() }