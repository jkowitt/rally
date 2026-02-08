package com.vanwagner.rally.screens

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SportsFootball
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.EmojiEvents
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
import com.vanwagner.rally.core.theme.RallyColors

@Composable
fun HomeTab() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RallyColors.Navy)
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Welcome Header
        Text(
            text = "Hey, Alex!",
            fontSize = 24.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color.White
        )
        Text(
            text = "Go Mountaineers!",
            fontSize = 14.sp,
            color = RallyColors.Orange
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Next Game Card
        Text(
            text = "Next Game",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Spacer(modifier = Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(RallyColors.NavyMid),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Filled.SportsFootball,
                    contentDescription = null,
                    tint = RallyColors.Orange,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "vs. Rival University",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Saturday, Oct 12 \u2022 3:30 PM",
                    fontSize = 12.sp,
                    color = RallyColors.Gray
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Points Summary
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            PointsCard(
                modifier = Modifier.weight(1f),
                title = "Balance",
                value = "1,250",
                icon = Icons.Filled.Star
            )
            PointsCard(
                modifier = Modifier.weight(1f),
                title = "Tier",
                value = "Starter",
                icon = Icons.Filled.EmojiEvents
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Content Feed Preview
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Latest",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = "See All",
                fontSize = 12.sp,
                color = RallyColors.Orange
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        repeat(3) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .padding(vertical = 4.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(RallyColors.NavyMid)
            )
        }
    }
}

@Composable
private fun PointsCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: ImageVector
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(RallyColors.NavyMid)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = RallyColors.Orange,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = value,
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            color = Color.White
        )
        Text(
            text = title,
            fontSize = 12.sp,
            color = RallyColors.Gray
        )
    }
}

@Preview
@Composable
private fun HomeTabPreview() {
    HomeTab()
}
