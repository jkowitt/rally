package com.vanwagner.rally.widget

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
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class CountdownWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            CountdownWidgetContent()
        }
    }

    @Composable
    private fun CountdownWidgetContent() {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(day = RallyWidgetColors.NavyMid, night = RallyWidgetColors.NavyMid))
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "Next Game",
                style = TextStyle(
                    color = ColorProvider(day = RallyWidgetColors.Gray, night = RallyWidgetColors.Gray),
                    fontSize = 12.sp,
                ),
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            Text(
                text = "vs Wildcats",
                style = TextStyle(
                    color = ColorProvider(day = RallyWidgetColors.OffWhite, night = RallyWidgetColors.OffWhite),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                ),
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                CountdownUnit("2", "DAYS")
                Spacer(modifier = GlanceModifier.width(12.dp))
                CountdownUnit("14", "HRS")
                Spacer(modifier = GlanceModifier.width(12.dp))
                CountdownUnit("32", "MIN")
            }
        }
    }

    @Composable
    private fun CountdownUnit(value: String, label: String) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = value,
                style = TextStyle(
                    color = ColorProvider(day = RallyWidgetColors.Orange, night = RallyWidgetColors.Orange),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                ),
            )
            Text(
                text = label,
                style = TextStyle(
                    color = ColorProvider(day = RallyWidgetColors.Gray, night = RallyWidgetColors.Gray),
                    fontSize = 10.sp,
                ),
            )
        }
    }
}

class CountdownWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CountdownWidget()
}
