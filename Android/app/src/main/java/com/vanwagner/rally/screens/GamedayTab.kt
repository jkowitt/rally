package com.vanwagner.rally.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.QuestionMark
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vanwagner.rally.core.theme.RallyColors

@Composable
fun GamedayTab() {
    var isCheckedIn by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(RallyColors.Navy)
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Scoreboard
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(RallyColors.NavyMid)
                .padding(24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("HOME", fontSize = 12.sp, color = RallyColors.Gray)
                Text("24", fontSize = 36.sp, fontWeight = FontWeight.Black, color = Color.White)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Q3", fontSize = 12.sp, color = RallyColors.Orange)
                Text("8:42", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("AWAY", fontSize = 12.sp, color = RallyColors.Gray)
                Text("17", fontSize = 36.sp, fontWeight = FontWeight.Black, color = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Check-in
        AnimatedVisibility(visible = !isCheckedIn) {
            Button(
                onClick = { isCheckedIn = true },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.horizontalGradient(
                                listOf(RallyColors.Orange, RallyColors.Orange.copy(alpha = 0.8f))
                            ),
                            RoundedCornerShape(12.dp)
                        ),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Filled.LocationOn, contentDescription = null, tint = Color.White)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Check In", fontWeight = FontWeight.SemiBold, color = Color.White)
                }
            }
        }

        AnimatedVisibility(
            visible = isCheckedIn,
            enter = fadeIn() + scaleIn()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(RallyColors.NavyMid)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = RallyColors.Success,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("Checked In!", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Text("+100 pts earned", fontSize = 12.sp, color = RallyColors.Success)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Activations
        Text(
            text = "Activations",
            fontSize = 24.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color.White
        )
        Spacer(modifier = Modifier.height(12.dp))

        ActivationRow(Icons.Filled.QuestionMark, "Halftime Prediction", 50, "Active")
        ActivationRow(Icons.Filled.Psychology, "Trivia Challenge", 25, "Coming Up")
        ActivationRow(Icons.Filled.GraphicEq, "Noise Meter", 30, "Q4")
    }
}

@Composable
private fun ActivationRow(
    icon: ImageVector,
    title: String,
    points: Int,
    status: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(RallyColors.NavyMid)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = RallyColors.Orange,
            modifier = Modifier.size(36.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text(status, fontSize = 12.sp, color = RallyColors.Gray)
        }
        Text(
            text = "+$points",
            fontSize = 28.sp,
            fontWeight = FontWeight.Black,
            color = RallyColors.Orange,
            textAlign = TextAlign.End
        )
    }
}

@Preview
@Composable
private fun GamedayTabPreview() {
    GamedayTab()
}
