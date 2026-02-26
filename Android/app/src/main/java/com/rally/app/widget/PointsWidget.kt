package com.rally.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
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

class PointsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            PointsWidgetContent()
        }
    }

    @Composable
    private fun PointsWidgetContent() {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(RallyWidgetColors.Navy))
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start,
        ) {
            Text(
                text = "Rally Points",
                style = TextStyle(
                    color = ColorProvider(RallyWidgetColors.Gray),
                    fontSize = 12.sp,
                ),
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            Text(
                text = "1,250",
                style = TextStyle(
                    color = ColorProvider(RallyWidgetColors.OffWhite),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                ),
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "All-Star",
                    style = TextStyle(
                        color = ColorProvider(RallyWidgetColors.Orange),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                )
            }
        }
    }
}

class PointsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PointsWidget()
}
