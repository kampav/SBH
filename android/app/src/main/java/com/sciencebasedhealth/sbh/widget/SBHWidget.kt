package com.sciencebasedhealth.sbh.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.sciencebasedhealth.sbh.MainActivity

/**
 * SBH home-screen Glance widget (2×2 compact, expandable to 4×2).
 *
 * Displays:
 *  - Daily calorie progress bar (consumed / target)
 *  - Macro summary: protein, carbs, fat
 *  - Current streak counter
 *
 * Data is read from SharedPreferences populated by WidgetDataPlugin
 * whenever the user logs a meal or opens the app.
 */
class SBHWidget : GlanceAppWidget() {

    companion object {
        const val PREFS_NAME = "sbh_widget_data"

        const val KEY_CALORIES    = "calories_consumed"
        const val KEY_CAL_TARGET  = "calories_target"
        const val KEY_PROTEIN     = "protein_consumed"
        const val KEY_CARBS       = "carbs_consumed"
        const val KEY_FAT         = "fat_consumed"
        const val KEY_STREAK      = "streak"
        const val KEY_LAST_UPDATE = "last_update_label"

        // Brand colours (inline as Long — Glance doesn't accept Color objects in all places)
        val COLOR_BG        = Color(0xFF0C1320)
        val COLOR_SURFACE   = Color(0xFF111B2E)
        val COLOR_VIOLET    = Color(0xFF7C3AED)
        val COLOR_CYAN      = Color(0xFF06B6D4)
        val COLOR_ROSE      = Color(0xFFF43F5E)
        val COLOR_TEXT1     = Color(0xFFFFFFFF)
        val COLOR_TEXT2     = Color(0xFFCBD5E1)
        val COLOR_TEXT3     = Color(0xFF64748B)
    }

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val calories   = prefs.getInt(KEY_CALORIES,   0)
        val calTarget  = prefs.getInt(KEY_CAL_TARGET, 2000).coerceAtLeast(1)
        val protein    = prefs.getInt(KEY_PROTEIN,    0)
        val carbs      = prefs.getInt(KEY_CARBS,      0)
        val fat        = prefs.getInt(KEY_FAT,        0)
        val streak     = prefs.getInt(KEY_STREAK,     0)
        val updated    = prefs.getString(KEY_LAST_UPDATE, "") ?: ""

        provideContent {
            GlanceTheme {
                WidgetContent(
                    calories   = calories,
                    calTarget  = calTarget,
                    protein    = protein,
                    carbs      = carbs,
                    fat        = fat,
                    streak     = streak,
                    updated    = updated,
                )
            }
        }
    }
}

// ─── UI ───────────────────────────────────────────────────────────────────────

@Composable
private fun WidgetContent(
    calories: Int,
    calTarget: Int,
    protein: Int,
    carbs: Int,
    fat: Int,
    streak: Int,
    updated: String,
) {
    val calProgress = (calories.toFloat() / calTarget).coerceIn(0f, 1f)
    val isOverBudget = calories > calTarget

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(SBHWidget.COLOR_BG)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        // ── Header ────────────────────────────────────────────────────────────
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "SBH",
                style = TextStyle(
                    color = ColorProvider(SBHWidget.COLOR_VIOLET),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                ),
            )
            Spacer(modifier = GlanceModifier.defaultWeight())
            if (streak > 0) {
                Text(
                    text = "🔥 $streak",
                    style = TextStyle(
                        color = ColorProvider(SBHWidget.COLOR_TEXT2),
                        fontSize = 11.sp,
                    ),
                )
            }
        }

        Spacer(modifier = GlanceModifier.height(6.dp))

        // ── Calories ──────────────────────────────────────────────────────────
        Text(
            text = "$calories / $calTarget kcal",
            style = TextStyle(
                color = ColorProvider(if (isOverBudget) SBHWidget.COLOR_ROSE else SBHWidget.COLOR_TEXT1),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
            ),
        )

        Spacer(modifier = GlanceModifier.height(4.dp))

        LinearProgressIndicator(
            progress = calProgress,
            modifier = GlanceModifier.fillMaxWidth().height(6.dp),
            color = ColorProvider(if (isOverBudget) SBHWidget.COLOR_ROSE else SBHWidget.COLOR_VIOLET),
            backgroundColor = ColorProvider(SBHWidget.COLOR_SURFACE),
        )

        Spacer(modifier = GlanceModifier.height(8.dp))

        // ── Macros row ────────────────────────────────────────────────────────
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            MacroChip(label = "P", value = protein, color = SBHWidget.COLOR_CYAN)
            Spacer(modifier = GlanceModifier.width(6.dp))
            MacroChip(label = "C", value = carbs,   color = SBHWidget.COLOR_VIOLET)
            Spacer(modifier = GlanceModifier.width(6.dp))
            MacroChip(label = "F", value = fat,     color = SBHWidget.COLOR_ROSE)
        }

        // ── Footer ────────────────────────────────────────────────────────────
        if (updated.isNotEmpty()) {
            Spacer(modifier = GlanceModifier.defaultWeight())
            Text(
                text = updated,
                style = TextStyle(
                    color = ColorProvider(SBHWidget.COLOR_TEXT3),
                    fontSize = 9.sp,
                ),
            )
        }
    }
}

@Composable
private fun MacroChip(label: String, value: Int, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "${value}g",
            style = TextStyle(
                color = ColorProvider(color),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
            ),
        )
        Text(
            text = label,
            style = TextStyle(
                color = ColorProvider(SBHWidget.COLOR_TEXT3),
                fontSize = 9.sp,
            ),
        )
    }
}

// ─── Receiver (required by Android widget system) ─────────────────────────────

class SBHWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SBHWidget()
}
