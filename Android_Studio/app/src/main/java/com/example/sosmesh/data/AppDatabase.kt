package com.example.sosmesh.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [SosMessage::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sosDao(): SosDao
}
