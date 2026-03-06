package com.sciencebasedhealth.sbh.plugin

import android.content.Context
import android.content.SharedPreferences
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.sciencebasedhealth.sbh.widget.SBHWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * WidgetDataPlugin — Capacitor plugin that bridges the web app to the Android
 * home-screen widget.
 *
 * Called from lib/widget.ts whenever the user logs a meal or opens the app.
 *
 * Usage (from web JS):
 *   await WidgetData.update({ caloriesConsumed, caloriesTarget, proteinConsumed,
 *                              carbsConsumed, fatConsumed, streak })
 */
@CapacitorPlugin(name = "WidgetData")
class WidgetDataPlugin : Plugin() {

    @PluginMethod
    fun update(call: PluginCall) {
        val context: Context = context

        val caloriesConsumed = call.getInt("caloriesConsumed", 0)!!
        val caloriesTarget   = call.getInt("caloriesTarget",   2000)!!
        val proteinConsumed  = call.getInt("proteinConsumed",  0)!!
        val carbsConsumed    = call.getInt("carbsConsumed",    0)!!
        val fatConsumed      = call.getInt("fatConsumed",      0)!!
        val streak           = call.getInt("streak",           0)!!

        // Write to SharedPreferences
        val prefs: SharedPreferences = context.getSharedPreferences(
            SBHWidget.PREFS_NAME, Context.MODE_PRIVATE
        )
        val timeLabel = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())

        prefs.edit()
            .putInt(SBHWidget.KEY_CALORIES,    caloriesConsumed)
            .putInt(SBHWidget.KEY_CAL_TARGET,  caloriesTarget)
            .putInt(SBHWidget.KEY_PROTEIN,     proteinConsumed)
            .putInt(SBHWidget.KEY_CARBS,       carbsConsumed)
            .putInt(SBHWidget.KEY_FAT,         fatConsumed)
            .putInt(SBHWidget.KEY_STREAK,      streak)
            .putString(SBHWidget.KEY_LAST_UPDATE, "Updated $timeLabel")
            .apply()

        // Trigger Glance widget refresh on the main thread
        CoroutineScope(Dispatchers.Main).launch {
            try {
                androidx.glance.appwidget.updateAll(context, SBHWidget::class.java)
            } catch (e: Exception) {
                // Widget not pinned on the home screen — safe to ignore
            }
        }

        call.resolve(JSObject().put("ok", true))
    }
}
