package com.hydra.mdm.services

import android.app.*
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.*
import androidx.core.app.NotificationCompat
import com.hydra.mdm.R
import com.hydra.mdm.receivers.DeviceAdminReceiver
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

class MonitoringService : Service() {
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponentName: ComponentName
    private lateinit var socket: Socket
    private var batteryLevel: Int = -1
    private val handler = Handler(Looper.getMainLooper())
    private val statusUpdateInterval = 60000L // 1 minute

    override fun onCreate() {
        super.onCreate()
        setupNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponentName = ComponentName(this, DeviceAdminReceiver::class.java)
        
        setupSocketConnection()
        startStatusUpdates()
    }

    private fun setupSocketConnection() {
        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to getDeviceToken())
                reconnection = true
                reconnectionDelay = 5000
                reconnectionAttempts = Int.MAX_VALUE
            }
            
            socket = IO.socket(SERVER_URL, options)
            
            socket.on(Socket.EVENT_CONNECT) {
                sendDeviceInfo()
            }
            
            socket.on("command") { args ->
                handleCommand(args[0] as JSONObject)
            }
            
            socket.connect()
        } catch (e: URISyntaxException) {
            e.printStackTrace()
        }
    }

    private fun handleCommand(command: JSONObject) {
        when (command.getString("type")) {
            "LOCK_DEVICE" -> {
                if (devicePolicyManager.isAdminActive(adminComponentName)) {
                    devicePolicyManager.lockNow()
                    sendCommandResponse("DEVICE_LOCKED", true)
                } else {
                    sendCommandResponse("DEVICE_LOCKED", false, "Admin privileges not granted")
                }
            }
            "UPDATE_SETTINGS" -> {
                val settings = command.getJSONObject("settings")
                updateDeviceSettings(settings)
            }
        }
    }

    private fun updateDeviceSettings(settings: JSONObject) {
        if (devicePolicyManager.isAdminActive(adminComponentName)) {
            settings.keys().forEach { key ->
                when (key) {
                    "cameraEnabled" -> {
                        devicePolicyManager.setCameraDisabled(
                            adminComponentName,
                            !settings.getBoolean(key)
                        )
                    }
                    "screenTimeout" -> {
                        devicePolicyManager.setMaximumTimeToLock(
                            adminComponentName,
                            settings.getLong(key)
                        )
                    }
                }
            }
            sendCommandResponse("SETTINGS_CHANGED", true)
        } else {
            sendCommandResponse("SETTINGS_CHANGED", false, "Admin privileges not granted")
        }
    }

    private fun startStatusUpdates() {
        handler.postDelayed(object : Runnable {
            override fun run() {
                updateDeviceStatus()
                handler.postDelayed(this, statusUpdateInterval)
            }
        }, statusUpdateInterval)
    }

    private fun updateDeviceStatus() {
        val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        
        val statusData = JSONObject().apply {
            put("batteryLevel", batteryLevel)
            put("deviceInfo", JSONObject().apply {
                put("model", Build.MODEL)
                put("manufacturer", Build.MANUFACTURER)
                put("osVersion", Build.VERSION.RELEASE)
            })
        }
        
        socket.emit("status_update", statusData)
    }

    private fun sendCommandResponse(type: String, success: Boolean, message: String? = null) {
        val response = JSONObject().apply {
            put("type", type)
            put("success", success)
            message?.let { put("message", it) }
            put("timestamp", System.currentTimeMillis())
        }
        socket.emit("command_response", response)
    }

    private fun setupNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Device Monitoring",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors device status and manages security policies"
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Device Management Active")
            .setContentText("Monitoring device security and status")
            .setSmallIcon(R.drawable.ic_shield)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
        socket.disconnect()
    }

    private fun getDeviceToken(): String {
        // Implementation for getting device token from shared preferences or generating new one
        return "your-device-token"
    }

    companion object {
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "HydraMDM"
        private const val SERVER_URL = "https://your-server-url.com"
    }
} 