package com.signamais.player.api

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.signamais.player.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit

class SignaMaisApi(private val baseUrl: String) {

    private val gson = Gson()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val JSON = "application/json; charset=utf-8".toMediaType()

    private var playerId: String? = null

    fun setPlayerId(id: String) {
        this.playerId = id
    }

    private fun headers(): Headers = Headers.Builder()
        .add("x-player-id", playerId ?: "")
        .add("Content-Type", "application/json")
        .build()

    // ===== Registration =====
    fun register(): RegisterResponse {
        val body = "{}".toRequestBody(JSON)
        val request = Request.Builder()
            .url("$baseUrl/api/player/register")
            .post(body)
            .headers(headers())
            .build()

        val response = client.newCall(request).execute()
        return gson.fromJson(response.body?.string(), RegisterResponse::class.java)
    }

    fun registerPlayer(name: String, pairingCode: String): RegisterResponse {
        val json = gson.toJson(PlayerRegisterRequest(name, pairingCode))
        val body = json.toRequestBody(JSON)
        val request = Request.Builder()
            .url("$baseUrl/api/players")
            .post(body)
            .headers(headers())
            .build()

        val response = client.newCall(request).execute()
        val result = gson.fromJson(response.body?.string(), RegisterResponse::class.java)

        if (result.success) {
            playerId = result.playerId
        }
        return result
    }

    // ===== Schedule =====
    fun fetchSchedule(): ScheduleResponse? {
        val request = Request.Builder()
            .url("$baseUrl/api/player/schedule")
            .get()
            .headers(headers())
            .build()

        return try {
            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: return null
            gson.fromJson(body, ScheduleResponse::class.java)
        } catch (e: IOException) {
            null
        }
    }

    // ===== Required Files =====
    fun fetchRequiredFiles(): RequiredFilesResponse? {
        val request = Request.Builder()
            .url("$baseUrl/api/player/required-files")
            .get()
            .headers(headers())
            .build()

        return try {
            val response = client.newCall(request).execute()
            val body = response.body?.string() ?: return null
            gson.fromJson(body, RequiredFilesResponse::class.java)
        } catch (e: IOException) {
            null
        }
    }

    // ===== Download File =====
    fun downloadFile(fileId: String, destination: File): Boolean {
        val request = Request.Builder()
            .url("$baseUrl/api/player/file/$fileId")
            .get()
            .headers(headers())
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return false
            val sink = destination.outputStream()
            response.body?.byteStream()?.use { input ->
                sink.use { output ->
                    input.copyTo(output)
                }
            }
            true
        } catch (e: IOException) {
            false
        }
    }

    // ===== Heartbeat =====
    fun sendHeartbeat(): Boolean {
        val json = gson.toJson(PlayerStatusRequest("online", "1.0.0", "android"))
        val body = json.toRequestBody(JSON)
        val request = Request.Builder()
            .url("$baseUrl/api/player/status")
            .post(body)
            .headers(headers())
            .build()

        return try {
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: IOException) {
            false
        }
    }

    // ===== Stats =====
    fun sendStats(stats: List<ProofOfPlayEntry>): Boolean {
        val map = mapOf("stats" to stats)
        val json = gson.toJson(map)
        val body = json.toRequestBody(JSON)
        val request = Request.Builder()
            .url("$baseUrl/api/player/stats")
            .post(body)
            .headers(headers())
            .build()

        return try {
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: IOException) {
            false
        }
    }

    // ===== Logs =====
    fun sendLog(level: String, message: String): Boolean {
        val logs = listOf(LogEntry(level, message))
        val map = mapOf("logs" to logs)
        val json = gson.toJson(map)
        val body = json.toRequestBody(JSON)
        val request = Request.Builder()
            .url("$baseUrl/api/player/logs")
            .post(body)
            .headers(headers())
            .build()

        return try {
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: IOException) {
            false
        }
    }
}
