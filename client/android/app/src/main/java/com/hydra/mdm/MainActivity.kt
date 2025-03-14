package com.hydra.mdm

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.hydra.mdm.receivers.DeviceAdminReceiver
import com.hydra.mdm.services.MonitoringService

class MainActivity : AppCompatActivity() {
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponentName: ComponentName
    private lateinit var statusText: TextView
    private lateinit var activateButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize device policy manager
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponentName = ComponentName(this, DeviceAdminReceiver::class.java)

        // Initialize views
        statusText = findViewById(R.id.statusText)
        activateButton = findViewById(R.id.activateButton)

        // Set up button click listener
        activateButton.setOnClickListener {
            if (!devicePolicyManager.isAdminActive(adminComponentName)) {
                // Launch the device admin activation screen
                val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
                intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponentName)
                intent.putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    getString(R.string.device_admin_explanation)
                )
                startActivityForResult(intent, DEVICE_ADMIN_REQUEST_CODE)
            } else {
                // Start monitoring service if not already running
                startMonitoringService()
            }
        }

        updateStatus()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun updateStatus() {
        val isAdmin = devicePolicyManager.isAdminActive(adminComponentName)
        statusText.text = if (isAdmin) {
            getString(R.string.status_active)
        } else {
            getString(R.string.status_inactive)
        }
        activateButton.text = if (isAdmin) {
            getString(R.string.button_start_monitoring)
        } else {
            getString(R.string.button_activate_admin)
        }
    }

    private fun startMonitoringService() {
        val serviceIntent = Intent(this, MonitoringService::class.java)
        startForegroundService(serviceIntent)
        finish() // Close the activity as the service will handle everything
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == DEVICE_ADMIN_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                // User granted admin access
                startMonitoringService()
            }
            updateStatus()
        }
    }

    companion object {
        private const val DEVICE_ADMIN_REQUEST_CODE = 123
    }
} 