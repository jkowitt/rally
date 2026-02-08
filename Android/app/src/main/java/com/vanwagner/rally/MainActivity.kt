package com.vanwagner.rally

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.vanwagner.rally.core.theme.RallyColors
import com.vanwagner.rally.navigation.RallyNavHost
import com.vanwagner.rally.theme.RallyAppTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            RallyAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = RallyColors.Navy
                ) {
                    RallyNavHost()
                }
            }
        }
    }
}
