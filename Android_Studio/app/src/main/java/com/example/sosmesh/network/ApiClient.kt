package com.example.sosmesh.network

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {
    private const val BASE_URL = "https://mostly-unbiased-ladybird.ngrok-free.app/api/"

    val instance: SosApiService by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        retrofit.create(SosApiService::class.java)
    }
}
