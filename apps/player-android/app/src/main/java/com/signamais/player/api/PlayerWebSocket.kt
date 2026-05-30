package com.signamais.player.api

import android.util.Log
import com.google.gson.Gson
import com.signamais.player.WsCommand
import kotlinx.coroutines.*
import okhttp3.*
import java.util.concurrent.TimeUnit
import kotlin.math.min
import kotlin.random.Random

class PlayerWebSocket(
    private val baseUrl: String,
    private val playerId: String,
    private val onCommand: (WsCommand) -> Unit,
    private val onConnected: () -> Unit,
    private val onDisconnected: () -> Unit
) {
    private val TAG = "PlayerWS"
    private val gson = Gson()
    private var webSocket: WebSocket? = null
    private var reconnectAttempt = 0
    private val maxReconnectAttempts = 20 // Max ~1 hour of retries
    private val reconnectScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var reconnectJob: Job? = null
    private var intentionallyClosed = false

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun connect() {
        intentionallyClosed = false
        reconnectAttempt = 0
        doConnect()
    }

    private fun doConnect() {
        val wsUrl = baseUrl
            .replace("http://", "ws://")
            .replace("https://", "wss://")

        val request = Request.Builder()
            .url("$wsUrl/ws?playerId=$playerId")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket conectado")
                reconnectAttempt = 0 // Reset on successful connection
                onConnected()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "WS mensagem: $text")
                try {
                    val cmd = gson.fromJson(text, WsCommand::class.java)
                    onCommand(cmd)
                } catch (e: Exception) {
                    Log.e(TAG, "Erro ao parsear comando WS", e)
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WS fechando: $code $reason")
                webSocket.close(1000, null)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WS fechado: $code $reason")
                onDisconnected()
                scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WS erro: ${t.message}")
                onDisconnected()
                scheduleReconnect()
            }
        })
    }

    /**
     * Reconnect with exponential backoff + jitter.
     * Starts at 1s, doubles each attempt up to 60s max.
     * Stops after maxReconnectAttempts.
     */
    private fun scheduleReconnect() {
        if (intentionallyClosed) return
        if (reconnectAttempt >= maxReconnectAttempts) {
            Log.e(TAG, "WS: número máximo de tentativas de reconexão atingido ($maxReconnectAttempts)")
            return
        }

        reconnectAttempt++
        
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s...
        val baseDelay = 1000L * Math.pow(2.0, (reconnectAttempt - 1).toDouble()).toLong()
        val cappedDelay = min(baseDelay, 60000L)
        // Add jitter: ±25%
        val jitter = (cappedDelay * 0.25 * (Random.nextDouble() - 0.5)).toLong()
        val delayMs = cappedDelay + jitter

        Log.d(TAG, "WS: reconectando em ${delayMs}ms (tentativa $reconnectAttempt/$maxReconnectAttempts)")

        reconnectJob = reconnectScope.launch {
            delay(delayMs)
            if (!intentionallyClosed) {
                doConnect()
            }
        }
    }

    fun disconnect() {
        intentionallyClosed = true
        reconnectJob?.cancel()
        webSocket?.close(1000, "Player encerrando")
        webSocket = null
    }
}
