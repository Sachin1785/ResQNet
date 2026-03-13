package com.example.sosmesh.data

import android.content.Context
import androidx.room.Room

class SosRepository(context: Context) {
    private val database = Room.databaseBuilder(
        context.applicationContext,
        AppDatabase::class.java,
        "sos_mesh.db"
    ).build()

    private val sosDao = database.sosDao()

    suspend fun addMessage(message: SosMessage) {
        sosDao.insertMessage(message)
    }

    suspend fun getPendingMessages(): List<SosMessage> {
        return sosDao.getUndeliveredMessages()
    }
    
    suspend fun getAllMessages(): List<SosMessage> {
        return sosDao.getAllMessages()
    }

    suspend fun markDelivered(msgId: String) {
        sosDao.markAsDelivered(msgId)
    }
    
    suspend fun hasMessage(msgId: String): Boolean {
        return sosDao.hasMessage(msgId)
    }
    
    companion object {
        @Volatile
        private var INSTANCE: SosRepository? = null

        fun getInstance(context: Context): SosRepository {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SosRepository(context).also { INSTANCE = it }
            }
        }
    }
}
