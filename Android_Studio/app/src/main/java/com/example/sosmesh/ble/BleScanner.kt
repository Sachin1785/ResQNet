package com.example.sosmesh.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import com.example.sosmesh.data.SosMessage
import com.example.sosmesh.data.SosRepository
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID

@SuppressLint("MissingPermission")
class BleScanner(
    private val context: Context,
    private val repository: SosRepository
) {
    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val adapter = bluetoothManager.adapter
    private val scanner = adapter.bluetoothLeScanner
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)
    
    // Simple deduplication for current scan session
    private val connectedDevices = mutableSetOf<String>()
    
    // Public getter for discovered device count
    fun getDiscoveredDeviceCount(): Int = connectedDevices.size

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.device?.let { device ->
                if (!connectedDevices.contains(device.address)) {
                    connectedDevices.add(device.address)
                    device.connectGatt(context, false, gattCallback)
                }
            }
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                gatt.requestMtu(512)
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                connectedDevices.remove(gatt.device.address)
                gatt.close()
            }
        }

        override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
            gatt.discoverServices()
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val service = gatt.getService(Constants.SOS_SERVICE_UUID)
                val characteristic = service?.getCharacteristic(Constants.SOS_CHARACTERISTIC_UUID)
                if (characteristic != null) {
                    gatt.readCharacteristic(characteristic)
                } else {
                    gatt.disconnect()
                }
            } else {
                gatt.disconnect()
            }
        }

        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val data = characteristic.value
                val json = String(data, Charsets.UTF_8)
                
                try {
                    val listType = object : TypeToken<List<SosMessage>>() {}.type
                    val messages: List<SosMessage> = gson.fromJson(json, listType)
                    
                    scope.launch {
                        var newCount = 0
                        messages.forEach { msg ->
                            if (!repository.hasMessage(msg.msgId)) {
                                repository.addMessage(msg)
                                newCount++
                            }
                        }
                        if (newCount > 0) {
                            Log.d("BleScanner", "📥 Received $newCount new message(s) from nearby device")
                        }
                    }
                } catch (e: Exception) {
                    Log.e("BleScanner", "Error parsing message", e)
                }
            }
            gatt.disconnect()
        }
    }

    fun startScanning() {
        if (scanner == null) return
        
        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(Constants.SOS_SERVICE_UUID))
            .build()
            
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_BALANCED)
            .build()
            
        scanner.startScan(listOf(filter), settings, scanCallback)
        Log.d("BleScanner", "Scanning started")
    }

    fun stopScanning() {
        scanner?.stopScan(scanCallback)
        // Clear cache so we can reconnect if needed? 
        // Or keep it to avoid loops. For now, clear it on stop.
        connectedDevices.clear()
    }
}
