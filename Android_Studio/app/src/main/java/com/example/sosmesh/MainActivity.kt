package com.example.sosmesh

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.example.sosmesh.ble.MeshManager
import com.example.sosmesh.data.SosMessage
import com.example.sosmesh.data.SosRepository
import com.example.sosmesh.network.ApiClient
import com.example.sosmesh.network.UploadWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity(), LocationListener {

    private lateinit var meshManager: MeshManager
    private lateinit var statusText: TextView
    private lateinit var logsText: TextView
    private lateinit var repository: SosRepository
    private lateinit var locationManager: LocationManager
    
    // UI Elements
    private lateinit var etName: EditText
    private lateinit var spinnerIncidentType: Spinner
    private lateinit var tvLatitude: TextView
    private lateinit var tvLongitude: TextView
    private lateinit var tvDeviceCount: TextView
    
    // Location data
    private var currentLatitude: Double = 0.0
    private var currentLongitude: Double = 0.0
    
    // Mesh activity tracking
    private var meshCycleCount = 0

    private val requestPermissionsLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                                  permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            
            val bluetoothGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                permissions[Manifest.permission.BLUETOOTH_SCAN] == true &&
                permissions[Manifest.permission.BLUETOOTH_ADVERTISE] == true &&
                permissions[Manifest.permission.BLUETOOTH_CONNECT] == true
            } else {
                permissions[Manifest.permission.BLUETOOTH] == true &&
                permissions[Manifest.permission.BLUETOOTH_ADMIN] == true
            }
            
            val missingPermissions = mutableListOf<String>()
            
            if (!locationGranted) {
                missingPermissions.add("Location")
            }
            if (!bluetoothGranted) {
                missingPermissions.add("Bluetooth")
            }
            
            if (missingPermissions.isEmpty()) {
                startMeshSystem()
                startLocationUpdates()
            } else {
                val message = "Missing: ${missingPermissions.joinToString(", ")}"
                Toast.makeText(this, "Please grant all permissions: $message", Toast.LENGTH_LONG).show()
                statusText.text = "Status: Permissions Missing"
                
                // Still try to start what we can
                if (bluetoothGranted) {
                    startMeshSystem()
                }
                if (locationGranted) {
                    startLocationUpdates()
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize UI elements
        statusText = findViewById(R.id.tv_status)
        logsText = findViewById(R.id.tv_logs)
        etName = findViewById(R.id.et_name)
        spinnerIncidentType = findViewById(R.id.spinner_incident_type)
        tvLatitude = findViewById(R.id.tv_latitude)
        tvLongitude = findViewById(R.id.tv_longitude)
        tvDeviceCount = findViewById(R.id.tv_device_count)
        val btnSendSos = findViewById<Button>(R.id.btn_send_sos)
        // val btnTestUpload = findViewById<Button>(R.id.btn_test_upload)
        
        repository = SosRepository.getInstance(this)
        meshManager = MeshManager(this)
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager

        // Setup incident type spinner
        setupIncidentTypeSpinner()
        
        // Enable scrolling in logs TextView
        logsText.movementMethod = android.text.method.ScrollingMovementMethod()

        btnSendSos.setOnClickListener {
            sendSosSignal()
        }
        
        /*
        btnTestUpload.setOnClickListener {
            testServerUpload()
        }
        */

        checkAndRequestPermissions()
        setupUploadWorker()
        startActiveUploader() // Start fast 30s uploader
        startLogPoller()
    }
    
    private fun setupIncidentTypeSpinner() {
        val incidentTypes = resources.getStringArray(R.array.incident_types)
        val adapter = ArrayAdapter(
            this,
            R.layout.spinner_item,
            incidentTypes
        )
        adapter.setDropDownViewResource(R.layout.spinner_dropdown_item)
        spinnerIncidentType.adapter = adapter
    }
    
    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            permissions.add(Manifest.permission.BLUETOOTH)
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
             permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        requestPermissionsLauncher.launch(permissions.toTypedArray())
    }

    private fun startMeshSystem() {
        statusText.text = getString(R.string.status_mesh_active)
        meshManager.start()
        Toast.makeText(this, "Mesh Started - Broadcasting every 15s", Toast.LENGTH_SHORT).show()
        startMeshActivityMonitor()
    }
    
    private fun startLocationUpdates() {
        try {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                // Request location updates
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000L, // 5 seconds
                    10f,   // 10 meters
                    this
                )
                
                // Try to get last known location immediately
                val lastLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                
                if (lastLocation != null) {
                    updateLocationDisplay(lastLocation)
                }
            }
        } catch (e: SecurityException) {
            Log.e("MainActivity", "Location permission error", e)
            tvLatitude.text = "Permission denied"
            tvLongitude.text = "Permission denied"
        }
    }
    
    private fun updateLocationDisplay(location: Location) {
        currentLatitude = location.latitude
        currentLongitude = location.longitude
        
        tvLatitude.text = String.format("%.6f°", currentLatitude)
        tvLongitude.text = String.format("%.6f°", currentLongitude)
    }
    
    override fun onLocationChanged(location: Location) {
        updateLocationDisplay(location)
    }
    
    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {
        // Legacy method - no action needed
    }
    
    override fun onProviderEnabled(provider: String) {
        Toast.makeText(this, "GPS Enabled", Toast.LENGTH_SHORT).show()
    }
    
    override fun onProviderDisabled(provider: String) {
        Toast.makeText(this, "GPS Disabled - Enable for accurate location", Toast.LENGTH_LONG).show()
    }
    
    private fun sendSosSignal() {
        val userName = etName.text.toString().trim()
        val incidentType = spinnerIncidentType.selectedItem.toString()
        
        if (userName.isEmpty()) {
            Toast.makeText(this, "Please enter your name", Toast.LENGTH_SHORT).show()
            etName.requestFocus()
            return
        }
        
        val msg = SosMessage(
            msgId = UUID.randomUUID().toString(),
            name = userName,
            latitude = currentLatitude,
            longitude = currentLongitude,
            emergency = incidentType,
            timestamp = System.currentTimeMillis()
        )
        
        lifecycleScope.launch {
            repository.addMessage(msg)
            Toast.makeText(this@MainActivity, "SOS Created & Broadcasting!", Toast.LENGTH_SHORT).show()
            statusText.text = getString(R.string.status_sos_active)
        }
    }
    
    private fun setupUploadWorker() {
        // ... (Keep existing code)
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val uploadWork = PeriodicWorkRequestBuilder<UploadWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()
            
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "SosUploadWork",
            ExistingPeriodicWorkPolicy.KEEP,
            uploadWork
        )
    }

    private fun startActiveUploader() {
        lifecycleScope.launch(Dispatchers.IO) {
            while (true) {
                try {
                    val pendingMessages = repository.getPendingMessages()
                    if (pendingMessages.isNotEmpty()) {
                        Log.d("ActiveUploader", "Found ${pendingMessages.size} pending messages. Attempting upload...")
                        
                        pendingMessages.forEach { msg ->
                            try {
                                val response = ApiClient.instance.sendSos(msg)
                                if (response.isSuccessful) {
                                    Log.d("ActiveUploader", "✅ Uploaded: ${msg.msgId}")
                                    repository.markDelivered(msg.msgId)
                                } else {
                                    Log.e("ActiveUploader", "❌ Failed ${msg.msgId}: ${response.code()}")
                                }
                            } catch (e: Exception) {
                                Log.e("ActiveUploader", "❌ Error uploading ${msg.msgId}", e)
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e("ActiveUploader", "Loop error", e)
                }
                delay(30_000) // Check every 30 seconds
            }
        }
    }

    private fun startMeshActivityMonitor() {
        lifecycleScope.launch {
            while (true) {
                delay(1000) // Update every second
                meshCycleCount++
                
                // Update device counter
                val deviceCount = meshManager.getDiscoveredDeviceCount()
                tvDeviceCount.text = "📡 $deviceCount"
            }
        }
    }
    
    private fun startLogPoller() {
        lifecycleScope.launch {
            while (true) {
                val messages = repository.getAllMessages()
                val sb = StringBuilder()
                sb.append("📡 Mesh Cycles: $meshCycleCount (Advertising/Scanning)\n")
                sb.append("📨 Total Messages: ${messages.size}\n\n")
                
                messages.forEach { msg ->
                    val status = if (msg.isDelivered) "☁️ UPLOADED" else "📡 MESH ACTIVE"
                    sb.append("[$status]\n")
                    sb.append("ID: ${msg.msgId.take(8)}...\n")
                    sb.append("👤 ${msg.name}\n")
                    sb.append("🚨 ${msg.emergency}\n")
                    sb.append("📍 ${String.format("%.4f", msg.latitude)}, ${String.format("%.4f", msg.longitude)}\n")
                    sb.append("⏰ ${java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date(msg.timestamp))}\n")
                    sb.append("----------------\n")
                }
                
                logsText.text = sb.toString()
                delay(2000)
            }
        }
    }
    
    private fun testServerUpload() {
        lifecycleScope.launch {
            try {
                Toast.makeText(this@MainActivity, "🔧 Sending test packet...", Toast.LENGTH_SHORT).show()
                
                // Create a test message
                val testMessage = SosMessage(
                    msgId = "TEST-${System.currentTimeMillis()}",
                    type = "SOS",
                    name = "Test User",
                    latitude = currentLatitude,
                    longitude = currentLongitude,
                    emergency = "Server Connection Test",
                    timestamp = System.currentTimeMillis(),
                    isDelivered = false
                )
                
                // Send directly to server
                val response = withContext(Dispatchers.IO) {
                    ApiClient.instance.sendSos(testMessage)
                }
                
                if (response.isSuccessful) {
                    Toast.makeText(
                        this@MainActivity, 
                        "✅ Server responded! Code: ${response.code()}", 
                        Toast.LENGTH_LONG
                    ).show()
                    Log.d("TestUpload", "✅ Success! Response code: ${response.code()}")
                } else {
                    Toast.makeText(
                        this@MainActivity, 
                        "❌ Server error: ${response.code()}", 
                        Toast.LENGTH_LONG
                    ).show()
                    Log.e("TestUpload", "❌ Failed with code: ${response.code()}")
                }
                
            } catch (e: Exception) {
                Toast.makeText(
                    this@MainActivity, 
                    "❌ Network error: ${e.message}", 
                    Toast.LENGTH_LONG
                ).show()
                Log.e("TestUpload", "❌ Exception: ${e.message}", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        meshManager.stop()
        locationManager.removeUpdates(this)
    }
}