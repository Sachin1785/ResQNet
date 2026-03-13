package com.example.sosmesh.network

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.sosmesh.data.SosRepository

class UploadWorker(
    appContext: Context, 
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val repository = SosRepository.getInstance(applicationContext)
        val messages = repository.getPendingMessages()
        
        Log.d("UploadWorker", "Checking for pending messages: ${messages.size} found")

        if (messages.isEmpty()) {
            return Result.success()
        }

        var allSuccess = true
        
        messages.forEach { msg ->
            try {
                // Using a try-catch for each individual message to allow partial success
                val response = ApiClient.instance.sendSos(msg)
                if (response.isSuccessful) {
                    Log.d("UploadWorker", "Uploaded message: ${msg.msgId}")
                    repository.markDelivered(msg.msgId)
                } else {
                    Log.e("UploadWorker", "Failed to upload ${msg.msgId}: ${response.code()}")
                    allSuccess = false
                }
            } catch (e: Exception) {
                Log.e("UploadWorker", "Exception uploading ${msg.msgId}", e)
                allSuccess = false
            }
        }

        // If any failed, we return Retry so WorkManager can back off and try again later
        return if (allSuccess) Result.success() else Result.retry() 
    }
}
