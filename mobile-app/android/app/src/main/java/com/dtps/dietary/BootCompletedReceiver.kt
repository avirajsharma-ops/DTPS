package com.dtps.dietary

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging

/**
 * Receiver to handle device boot and ensure Firebase connection is maintained
 * for receiving push notifications even when app is not running
 */
class BootCompletedReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootCompletedReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Boot completed, ensuring Firebase connection")
        
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
                // Re-initialize Firebase to ensure token is fresh and connection is active
                refreshFirebaseToken(context)
            }
        }
    }

    private fun refreshFirebaseToken(context: Context) {
        try {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    Log.d(TAG, "Firebase token refreshed on boot: ${token?.take(20)}...")
                    
                    // Store token for when the app opens
                    val prefs = context.getSharedPreferences("dtps_prefs", Context.MODE_PRIVATE)
                    prefs.edit().putString("fcm_token", token).apply()
                } else {
                    Log.e(TAG, "Failed to refresh Firebase token on boot", task.exception)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing Firebase token on boot", e)
        }
    }
}
