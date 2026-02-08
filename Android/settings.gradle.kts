pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Rally"

include(":app")
include(":core")
include(":networking")
include(":ui")
include(":analytics")
include(":feature:auth")
include(":feature:gameday")
include(":feature:loyalty")
include(":feature:content")
include(":feature:sponsor")
include(":feature:location")
