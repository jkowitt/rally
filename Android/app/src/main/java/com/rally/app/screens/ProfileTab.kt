package com.rally.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Divider
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rally.app.core.theme.RallyColors

@Composable
fun ProfileTab() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RallyColors.Navy)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Avatar
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(RallyColors.Orange.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Filled.Person,
                contentDescription = null,
                tint = RallyColors.Orange,
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))
        Text("Alex Fan", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(RallyColors.Orange.copy(alpha = 0.15f))
                .padding(horizontal = 16.dp, vertical = 4.dp)
        ) {
            Text("Starter", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = RallyColors.Orange)
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Stats
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(RallyColors.NavyMid)
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            StatColumn("12", "Games")
            VerticalDivider()
            StatColumn("1,250", "Points")
            VerticalDivider()
            StatColumn("3", "Rewards")
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Menu
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
        ) {
            MenuRow(Icons.Filled.History, "Points History", RallyColors.Orange)
            MenuRow(Icons.Filled.CardGiftcard, "My Rewards", RallyColors.Orange)
            MenuRow(Icons.Filled.Notifications, "Notifications", RallyColors.Orange)
            MenuRow(Icons.Filled.Settings, "Settings", RallyColors.Orange)
            MenuRow(Icons.AutoMirrored.Filled.HelpOutline, "Help & Support", RallyColors.Orange)
            HorizontalDivider(color = RallyColors.Navy, thickness = 1.dp)
            MenuRow(Icons.AutoMirrored.Filled.ExitToApp, "Sign Out", RallyColors.Error)
        }
    }
}

@Composable
private fun StatColumn(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 28.sp, fontWeight = FontWeight.Black, color = Color.White)
        Text(label, fontSize = 12.sp, color = RallyColors.Gray)
    }
}

@Composable
private fun VerticalDivider() {
    Box(
        modifier = Modifier
            .width(1.dp)
            .height(40.dp)
            .background(RallyColors.Gray.copy(alpha = 0.3f))
    )
}

@Composable
private fun MenuRow(icon: ImageVector, title: String, tint: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(RallyColors.NavyMid)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(title, fontSize = 16.sp, color = if (tint == RallyColors.Error) RallyColors.Error else Color.White, modifier = Modifier.weight(1f))
        if (tint != RallyColors.Error) {
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = RallyColors.Gray, modifier = Modifier.size(16.dp))
        }
    }
}

@Preview
@Composable
private fun ProfileTabPreview() {
    ProfileTab()
}
