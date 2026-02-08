plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.vanwagner.rally.networking"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"https://api-dev.rally.app/v1\"")
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"https://api.rally.app/v1\"")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.retrofit)
    implementation(libs.retrofit.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlin.serialization)
    implementation(libs.coroutines.android)
    implementation(libs.security.crypto)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.timber)
}
