package com.example.sosmesh.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "sos_messages")
data class SosMessage(
    @PrimaryKey
    @SerializedName("msg_id")
    val msgId: String,
    @SerializedName("type")
    val type: String = "SOS",
    @SerializedName("name")
    val name: String,
    @SerializedName("latitude")
    val latitude: Double,
    @SerializedName("longitude")
    val longitude: Double,
    @SerializedName("emergency")
    val emergency: String,
    @SerializedName("timestamp")
    val timestamp: Long,
    @SerializedName("delivered")
    var isDelivered: Boolean = false
)
