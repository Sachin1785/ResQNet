package com.example.sosmesh.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.example.sosmesh.R
import com.example.sosmesh.ble.MeshManager
import com.example.sosmesh.network.GatewayUploader

class MeshService : Service() {
    private lateinit var meshManager: MeshManager
    private lateinit var gatewayUploader: GatewayUploader
    private val binder = LocalBinder()

    inner class LocalBinder : Binder() {
        fun getService(): MeshService = this@MeshService
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        meshManager = MeshManager(this)
        gatewayUploader = GatewayUploader(this)
        gatewayUploader.startListening()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification()
        startForeground(1, notification)
        meshManager.start()
        return START_STICKY
    }

    override fun onDestroy() {
        meshManager.stop()
        gatewayUploader.stopListening()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder {
        return binder
    }

    fun getDeviceCount(): Int = meshManager.getDiscoveredDeviceCount()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "MESH_CHANNEL_ID",
                "SOS Mesh Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, "MESH_CHANNEL_ID")
            .setContentTitle("SOS Mesh Active")
            .setContentText("Relaying emergency messages in background...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .build()
    }
}
