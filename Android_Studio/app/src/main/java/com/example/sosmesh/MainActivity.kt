package com.example.sosmesh

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.example.sosmesh.data.SosMessage
import com.example.sosmesh.data.SosRepository
import com.example.sosmesh.network.UploadWorker
import com.example.sosmesh.service.MeshService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.UUID
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity(), LocationListener {

    private var meshService: MeshService? = null
    private var isBound = false

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

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(className: ComponentName, service: IBinder) {
            val binder = service as MeshService.LocalBinder
            meshService = binder.getService()
            isBound = true
        }

        override fun onServiceDisconnected(arg0: ComponentName) {
            isBound = false
        }
    }

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

        statusText = findViewById(R.id.tv_status)
        logsText = findViewById(R.id.tv_logs)
        etName = findViewById(R.id.et_name)
        spinnerIncidentType = findViewById(R.id.spinner_incident_type)
        tvLatitude = findViewById(R.id.tv_latitude)
        tvLongitude = findViewById(R.id.tv_longitude)
        tvDeviceCount = findViewById(R.id.tv_device_count)
        val btnSendSos = findViewById<Button>(R.id.btn_send_sos)
        
        repository = SosRepository.getInstance(this)
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager

        setupIncidentTypeSpinner()
        logsText.movementMethod = android.text.method.ScrollingMovementMethod()

        btnSendSos.setOnClickListener {
            sendSosSignal()
        }

        checkAndRequestPermissions()
        // Keep the old workmanager as a fallback backup
        setupUploadWorker() 
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
        
        val intent = Intent(this, MeshService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        bindService(intent, connection, Context.BIND_AUTO_CREATE)
        
        Toast.makeText(this, "Mesh Started in Background", Toast.LENGTH_SHORT).show()
        startMeshActivityMonitor()
    }
    
    private fun startLocationUpdates() {
        try {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000L,
                    10f,
                    this
                )
                
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
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    
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

    private fun startMeshActivityMonitor() {
        lifecycleScope.launch {
            while (true) {
                delay(1000)
                meshCycleCount++
                
                val deviceCount = if (isBound) meshService?.getDeviceCount() ?: 0 else 0
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

    override fun onDestroy() {
        super.onDestroy()
        if (isBound) {
            unbindService(connection)
            isBound = false
        }
        locationManager.removeUpdates(this)
    }
}