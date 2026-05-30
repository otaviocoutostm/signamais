package com.signamais.player.player

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.signamais.player.*
import com.signamais.player.api.PlayerWebSocket
import com.signamais.player.api.SignaMaisApi
import com.signamais.player.cache.PlayerCache
import kotlinx.coroutines.*

class PlayerService : Service() {

    companion object {
        const val ACTION_START = "com.signamais.player.START"
        const val ACTION_STOP = "com.signamais.player.STOP"
        const val EXTRA_SERVER_URL = "server_url"
        const val EXTRA_PLAYER_ID = "player_id"

        const val COLLECTION_INTERVAL_MS = 30000L // 30 seconds
    }

    private val TAG = "PlayerService"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var api: SignaMaisApi
    private lateinit var cache: PlayerCache
    private var webSocket: PlayerWebSocket? = null
    private var playerId: String? = null
    private var isRunning = false

    // Campaign state
    private var campaignIndex = 0
    private var campaignLayouts: List<LayoutItem>? = null
    private var currentOverlays: List<OverlayItem>? = null

    // Callbacks for UI
    var onLayoutUpdate: ((LayoutItem?, List<OverlayItem>?) -> Unit)? = null
    var onStatusChange: ((Boolean) -> Unit)? = null

    override fun onCreate() {
        super.onCreate()
        cache = PlayerCache(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val serverUrl = intent.getStringExtra(EXTRA_SERVER_URL) ?: return START_NOT_STICKY
                playerId = intent.getStringExtra(EXTRA_PLAYER_ID) ?: return START_NOT_STICKY

                api = SignaMaisApi(serverUrl)
                api.setPlayerId(playerId!!)

                if (!isRunning) {
                    startPlayer()
                }
            }
            ACTION_STOP -> {
                stopPlayer()
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun startPlayer() {
        isRunning = true
        onStatusChange?.invoke(true)

        // Connect WebSocket
        webSocket = PlayerWebSocket(
            baseUrl = api.toString(),
            playerId = playerId!!,
            onCommand = { cmd -> handleCommand(cmd) },
            onConnected = { Log.d(TAG, "WS conectado") },
            onDisconnected = { Log.d(TAG, "WS desconectado") }
        )
        webSocket?.connect()

        // Start polling cycle
        scope.launch {
            fetchSchedule()
            sendHeartbeat()

            while (isRunning) {
                delay(COLLECTION_INTERVAL_MS)
                if (!isRunning) break
                fetchSchedule()
                sendHeartbeat()
            }
        }
    }

    private fun stopPlayer() {
        isRunning = false
        cancelCampaignCycle()
        webSocket?.disconnect()
        onStatusChange?.invoke(false)
    }

    private fun handleCommand(cmd: WsCommand) {
        Log.d(TAG, "Comando recebido: ${cmd.command}")
        scope.launch {
            when (cmd.command) {
                "schedule_update" -> fetchSchedule()
                "restart" -> {
                    stopPlayer()
                    startPlayer()
                }
            }
        }
    }

    suspend fun fetchSchedule() {
        val schedule = api.fetchSchedule() ?: return

        if (schedule.layouts.isNullOrEmpty()) {
            campaignLayouts = null
            currentOverlays = null
            onLayoutUpdate?.invoke(null, null)
            return
        }

        currentOverlays = schedule.overlays

        // Check if it's a campaign
        if (schedule.layouts.size > 1 && schedule.layouts[0].isCampaignItem) {
            campaignLayouts = schedule.layouts
            startCampaignCycle()
        } else if (schedule.layouts.size == 1) {
            campaignLayouts = null
            cancelCampaignCycle()
            val layout = schedule.layouts[0]
            onLayoutUpdate?.invoke(layout, currentOverlays)

            // Download required files
            downloadRequiredFiles()
        }
    }

    private var campaignJob: Job? = null

    private fun startCampaignCycle() {
        cancelCampaignCycle()
        campaignIndex = 0

        campaignJob = scope.launch {
            while (isRunning && campaignLayouts != null) {
                val items = campaignLayouts ?: break
                if (items.isEmpty()) break

                val item = items[campaignIndex]
                onLayoutUpdate?.invoke(item, currentOverlays)

                val duration = (item.duration ?: 10) * 1000L
                campaignIndex = (campaignIndex + 1) % items.size

                delay(duration)
            }
        }
    }

    private fun cancelCampaignCycle() {
        campaignJob?.cancel()
        campaignJob = null
    }

    private suspend fun downloadRequiredFiles() {
        val files = api.fetchRequiredFiles() ?: return
        for (file in files.files) {
            if (!cache.isMediaCached(file.fileName)) {
                Log.d(TAG, "Baixando: ${file.name}")
                val dest = cache.cacheMedia(file.fileName)
                val success = api.downloadFile(file.id, dest)
                if (success) {
                    Log.d(TAG, "Download OK: ${file.name}")
                }
            }
        }
    }

    private suspend fun sendHeartbeat() {
        api.sendHeartbeat()
    }

    override fun onDestroy() {
        stopPlayer()
        scope.cancel()
        super.onDestroy()
    }
}
