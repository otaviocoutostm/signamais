package com.signamais.player.cache

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.signamais.player.MediaFile
import com.signamais.player.ScheduleResponse
import java.io.File

class PlayerCache(context: Context) {

    private val cacheDir = File(context.cacheDir, "signamais-media").apply { mkdirs() }
    private val configFile = File(context.filesDir, "player_config.json")
    private val gson = Gson()

    data class PlayerConfig(
        val serverUrl: String? = null,
        val playerId: String? = null
    )

    // ===== Player Config =====
    fun saveConfig(serverUrl: String, playerId: String) {
        val config = PlayerConfig(serverUrl, playerId)
        configFile.writeText(gson.toJson(config))
    }

    fun loadConfig(): PlayerConfig? {
        return try {
            if (!configFile.exists()) null
            else gson.fromJson(configFile.readText(), PlayerConfig::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun clearConfig() {
        configFile.delete()
    }

    // ===== Media Cache =====
    fun getMediaFile(fileName: String): File? {
        val file = File(cacheDir, fileName)
        return if (file.exists()) file else null
    }

    fun cacheMedia(fileName: String): File {
        return File(cacheDir, fileName)
    }

    fun isMediaCached(fileName: String): Boolean {
        return File(cacheDir, fileName).exists()
    }

    fun clearMediaCache() {
        cacheDir.deleteRecursively()
        cacheDir.mkdirs()
    }

    fun getCacheSize(): Long {
        return cacheDir.walkTopDown().filter { it.isFile }.sumOf { it.length() }
    }
}
