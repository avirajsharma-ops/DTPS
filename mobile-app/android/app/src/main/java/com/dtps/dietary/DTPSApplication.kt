package com.dtps.dietary

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging

class DTPSApplication : Application() {
    
    companion object {
        private const val TAG = "DTPSApplication"
        private const val CHANNEL_ID = "dtps_notifications"
        private const val CHANNEL_NAME = "DTPS Notifications"
    }
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        
        // Create notification channel
        createNotificationChannel()
        
        // Get and store FCM token
        getFCMToken()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications from DTPS app including messages, appointments, tasks, and meal plans"
                enableVibration(true)
                enableLights(true)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun getFCMToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "Fetching FCM token failed", task.exception)
                return@addOnCompleteListener
            }
            
            val token = task.result
            Log.d(TAG, "FCM Token: $token")
            
            // Store token in shared preferences for WebView to access
            val prefs = getSharedPreferences("dtps_prefs", Context.MODE_PRIVATE)
            prefs.edit().putString("fcm_token", token).apply()
        }
    }
}
