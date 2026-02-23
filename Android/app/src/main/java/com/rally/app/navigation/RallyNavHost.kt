package com.rally.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Stadium
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.rally.app.core.theme.RallyColors
import com.rally.app.screens.GamedayTab
import com.rally.app.screens.HomeTab
import com.rally.app.screens.ProfileTab
import com.rally.app.screens.RewardsTab

enum class RallyTab(
    val route: String,
    val label: String,
    val icon: ImageVector
) {
    Home("home", "Home", Icons.Filled.Home),
    Gameday("gameday", "Gameday", Icons.Filled.Stadium),
    Rewards("rewards", "Rewards", Icons.Filled.CardGiftcard),
    Profile("profile", "Profile", Icons.Filled.Person)
}

@Composable
fun RallyNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        containerColor = RallyColors.Navy,
        bottomBar = {
            NavigationBar(
                containerColor = RallyColors.NavyMid,
                contentColor = RallyColors.Gray
            ) {
                RallyTab.entries.forEach { tab ->
                    val selected = currentDestination?.hierarchy?.any { it.route == tab.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(tab.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.label
                            )
                        },
                        label = { Text(tab.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = RallyColors.Orange,
                            selectedTextColor = RallyColors.Orange,
                            unselectedIconColor = RallyColors.Gray,
                            unselectedTextColor = RallyColors.Gray,
                            indicatorColor = RallyColors.Orange.copy(alpha = 0.15f)
                        )
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = RallyTab.Home.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(RallyTab.Home.route) { HomeTab() }
            composable(RallyTab.Gameday.route) { GamedayTab() }
            composable(RallyTab.Rewards.route) { RewardsTab() }
            composable(RallyTab.Profile.route) { ProfileTab() }
        }
    }
}
