package com.example.sosmesh.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [SosMessage::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sosDao(): SosDao
}
