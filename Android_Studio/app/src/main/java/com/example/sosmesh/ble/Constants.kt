package com.example.sosmesh.ble

import java.util.UUID

object Constants {
    val SOS_SERVICE_UUID: UUID = UUID.fromString("00001825-0000-1000-8000-00805f9b34fb") // Custom or reuse Object Transfer? Using random for now.
    val SOS_CHARACTERISTIC_UUID: UUID = UUID.fromString("00002a2b-0000-1000-8000-00805f9b34fb") // Custom
    
    // For Service Data (parital ID). We'll use a specific allocated UUID for the Service if possible, 
    // but for this MVP we'll just use these.
}
