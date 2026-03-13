package com.example.sosmesh.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import com.example.sosmesh.data.SosRepository
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Arrays

@SuppressLint("MissingPermission")
class BleAdvertiser(
    private val context: Context,
    private val repository: SosRepository
) {
    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val adapter = bluetoothManager.adapter
    private var advertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null
    private val gson = Gson()
    private val scope = CoroutineScope(Dispatchers.IO)

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            Log.d("BleAdvertiser", "Advertising started successfully")
        }

        override fun onStartFailure(errorCode: Int) {
            Log.e("BleAdvertiser", "Advertising failed: $errorCode")
        }
    }

    private val gattServerCallback = object : BluetoothGattServerCallback() {
        override fun onCharacteristicReadRequest(
            device: BluetoothDevice,
            requestId: Int,
            offset: Int,
            characteristic: BluetoothGattCharacteristic
        ) {
            if (Constants.SOS_CHARACTERISTIC_UUID == characteristic.uuid) {
                scope.launch {
                    val messages = repository.getPendingMessages()
                    val json = gson.toJson(messages)
                    val bytes = json.toByteArray(Charsets.UTF_8)
                    
                    if (messages.isNotEmpty()) {
                        Log.d("BleAdvertiser", "📤 Sent ${messages.size} message(s) to nearby device")
                    }

                    if (offset >= bytes.size) {
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, ByteArray(0))
                        return@launch
                    }

                    val slice = Arrays.copyOfRange(bytes, offset, bytes.size)
                    gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, slice)
                }
            } else {
                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
            }
        }
    }

    fun startAdvertising() {
        advertiser = adapter.bluetoothLeAdvertiser
        if (advertiser == null) {
            Log.e("BleAdvertiser", "Bluetooth LE Advertising not supported")
            return
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
            .setConnectable(true)
            .setTimeout(0)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
            .build()

        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .addServiceUuid(ParcelUuid(Constants.SOS_SERVICE_UUID))
            .build()

        advertiser?.startAdvertising(settings, data, advertiseCallback)
        setupGattServer()
    }

    fun stopAdvertising() {
        advertiser?.stopAdvertising(advertiseCallback)
        gattServer?.close()
        gattServer = null
    }

    private fun setupGattServer() {
        gattServer = bluetoothManager.openGattServer(context, gattServerCallback)
        if (gattServer == null) {
            Log.e("BleAdvertiser", "Unable to open GATT Server")
            return
        }

        val service = BluetoothGattService(
            Constants.SOS_SERVICE_UUID,
            BluetoothGattService.SERVICE_TYPE_PRIMARY
        )

        val characteristic = BluetoothGattCharacteristic(
            Constants.SOS_CHARACTERISTIC_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )

        service.addCharacteristic(characteristic)
        gattServer?.addService(service)
    }
}
