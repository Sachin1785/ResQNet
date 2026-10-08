package com.example.sosmesh.network

import com.example.sosmesh.data.SosMessage
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface SosApiService {
    @POST("sosmesh")
    suspend fun sendSos(@Body message: SosMessage): Response<Void>

    @POST("sosmesh/batch")
    suspend fun sendBatch(@Body batchRequest: BatchRequest): Response<BatchResponse>
}

data class BatchRequest(
    val messages: List<SosMessage>
)

data class BatchResponse(
    val success: Boolean,
    val receipts: List<String>,
    val processed_count: Int
)
