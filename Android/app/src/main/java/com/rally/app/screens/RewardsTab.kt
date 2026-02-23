package com.rally.app.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Checkroom
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.PhoneIphone
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
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

private data class RewardItem(
    val title: String,
    val points: Int,
    val icon: ImageVector
)

private val sampleRewards = listOf(
    RewardItem("Rally T-Shirt", 500, Icons.Filled.Checkroom),
    RewardItem("Free Drink", 200, Icons.Filled.LocalCafe),
    RewardItem("Sideline Pass", 2500, Icons.Filled.Star),
    RewardItem("Ticket Upgrade", 1000, Icons.Filled.ConfirmationNumber),
    RewardItem("Digital Pack", 100, Icons.Filled.PhoneIphone),
    RewardItem("Bookstore 15%", 300, Icons.Filled.Storefront),
)

@Composable
fun RewardsTab() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RallyColors.Navy)
            .padding(16.dp)
    ) {
        // Points Balance
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(RallyColors.NavyMid)
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Your Balance", fontSize = 12.sp, color = RallyColors.Gray)
                Text("1,250 pts", fontSize = 36.sp, fontWeight = FontWeight.Black, color = Color.White)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("Starter", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = RallyColors.Orange)
                Text("750 pts to All-Star", fontSize = 12.sp, color = RallyColors.Gray)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Available Rewards",
            fontSize = 24.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color.White
        )
        Spacer(modifier = Modifier.height(12.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(sampleRewards) { reward ->
                RewardCard(reward)
            }
        }
    }
}

@Composable
private fun RewardCard(reward: RewardItem) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(RallyColors.NavyMid)
            .padding(12.dp)
    ) {
        // Icon placeholder
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(RallyColors.Navy),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = reward.icon,
                contentDescription = null,
                tint = RallyColors.Orange.copy(alpha = 0.5f),
                modifier = Modifier.size(36.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = reward.title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            maxLines = 2
        )
        Text(
            text = "${reward.points} pts",
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = RallyColors.Orange
        )
    }
}

@Preview
@Composable
private fun RewardsTabPreview() {
    RewardsTab()
}
