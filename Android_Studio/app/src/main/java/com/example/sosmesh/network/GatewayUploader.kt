package com.example.sosmesh.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import com.example.sosmesh.data.SosRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GatewayUploader(context: Context) {
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val repository = SosRepository.getInstance(context)
    private val scope = CoroutineScope(Dispatchers.IO)

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            Log.d("GatewayUploader", "Internet available. Triggering immediate upload.")
            uploadPendingMessages()
        }
    }

    fun startListening() {
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(request, networkCallback)
        // Check once on start
        scope.launch {
            uploadPendingMessages()
        }
    }

    fun stopListening() {
        try {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        } catch (e: Exception) {
            Log.e("GatewayUploader", "Error unregistering callback", e)
        }
    }

    private fun uploadPendingMessages() {
        scope.launch {
            val messages = repository.getPendingMessages()
            if (messages.isEmpty()) return@launch

            Log.d("GatewayUploader", "Found ${messages.size} pending messages for upload")
            
            try {
                val batchRequest = BatchRequest(messages)
                val response = ApiClient.instance.sendBatch(batchRequest)
                if (response.isSuccessful && response.body() != null) {
                    val batchResponse = response.body()!!
                    if (batchResponse.success) {
                        val receipts = batchResponse.receipts
                        Log.d("GatewayUploader", "✅ Uploaded batch successfully. Receipts: ${receipts.size}")
                        receipts.forEach { msgId ->
                            repository.markDelivered(msgId)
                        }
                    } else {
                        Log.e("GatewayUploader", "❌ Batch upload reported failure")
                    }
                } else {
                    Log.e("GatewayUploader", "❌ Failed batch upload: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("GatewayUploader", "❌ Error during batch upload", e)
            }
        }
    }
}
