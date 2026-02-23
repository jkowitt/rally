package com.rally.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class TierProgressWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            TierProgressWidgetContent()
        }
    }

    @Composable
    private fun TierProgressWidgetContent() {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(day = RallyWidgetColors.Navy, night = RallyWidgetColors.Navy))
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "All-Star",
                    style = TextStyle(
                        color = ColorProvider(day = RallyWidgetColors.Orange, night = RallyWidgetColors.Orange),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                    ),
                )
            }
            Spacer(modifier = GlanceModifier.height(4.dp))
            Text(
                text = "1,250 / 5,000 pts to MVP",
                style = TextStyle(
                    color = ColorProvider(day = RallyWidgetColors.Gray, night = RallyWidgetColors.Gray),
                    fontSize = 12.sp,
                ),
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            // Progress bar represented with background blocks
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .background(ColorProvider(day = RallyWidgetColors.NavyMid, night = RallyWidgetColors.NavyMid)),
            ) {}
        }
    }
}

class TierProgressWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TierProgressWidget()
}
