package com.example.sosmesh.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface SosDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertMessage(message: SosMessage)

    @Query("SELECT * FROM sos_messages WHERE isDelivered = 0")
    suspend fun getUndeliveredMessages(): List<SosMessage>

    @Query("SELECT * FROM sos_messages ORDER BY timestamp DESC")
    suspend fun getAllMessages(): List<SosMessage>

    @Query("UPDATE sos_messages SET isDelivered = 1 WHERE msgId = :msgId")
    suspend fun markAsDelivered(msgId: String)
    
    @Query("SELECT EXISTS(SELECT 1 FROM sos_messages WHERE msgId = :msgId)")
    suspend fun hasMessage(msgId: String): Boolean
}
