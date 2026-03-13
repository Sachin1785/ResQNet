package com.example.sosmesh.ble

import android.content.Context
import android.util.Log
import com.example.sosmesh.data.SosRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MeshManager(context: Context) {
    private val repository = SosRepository.getInstance(context)
    private val advertiser = BleAdvertiser(context, repository)
    private val scanner = BleScanner(context, repository)
    private val scope = CoroutineScope(Dispatchers.Main) // Main scope for orchestration
    private var job: Job? = null
    private var isRunning = false

    fun start() {
        if (isRunning) return
        isRunning = true
        
        // Start both advertising and scanning at the same time
        advertiser.startAdvertising()
        scanner.startScanning()
        
        // Keep them running
        job = scope.launch {
            while (isRunning) {
                delay(1000) // Just keep alive
            }
        }
    }

    fun stop() {
        isRunning = false
        job?.cancel()
        advertiser.stopAdvertising()
        scanner.stopScanning()
    }
    
    fun getDiscoveredDeviceCount(): Int = scanner.getDiscoveredDeviceCount()
}
