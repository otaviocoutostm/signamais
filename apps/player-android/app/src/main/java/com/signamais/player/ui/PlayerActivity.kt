package com.signamais.player.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.view.*
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import com.signamais.player.*
import com.signamais.player.api.SignaMaisApi
import com.signamais.player.cache.PlayerCache
import com.signamais.player.player.PlayerService
import kotlinx.coroutines.*

class PlayerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_SERVER_URL = "server_url"
        const val EXTRA_PLAYER_ID = "player_id"
    }

    private val TAG = "PlayerActivity"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var gson: Gson
    private lateinit var api: SignaMaisApi
    private lateinit var cache: PlayerCache
    private lateinit var playerView: FrameLayout

    private var webView: WebView? = null
    private var overlayWebView: WebView? = null
    private var fallbackText: TextView? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var playerId: String? = null
    private var serverUrl: String? = null
    private var isRunning = false
    private var currentLayout: LayoutData? = null
    private var currentOverlays: List<OverlayItem>? = null

    // Campaign state
    private var campaignIndex = 0
    private var campaignLayouts: List<LayoutItem>? = null
    private var campaignJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Fullscreen immersive mode
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        playerView = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }
        setContentView(playerView)

        // Keep screen on
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK, "SignaMais:Player")
        wakeLock?.acquire(10 * 60 * 1000L) // 10 minutes

        gson = Gson()
        cache = PlayerCache(this)

        serverUrl = intent.getStringExtra(EXTRA_SERVER_URL)
        playerId = intent.getStringExtra(EXTRA_PLAYER_ID)

        if (serverUrl == null || playerId == null) {
            // Go back to pairing
            startActivity(Intent(this, PairingActivity::class.java))
            finish()
            return
        }

        api = SignaMaisApi(serverUrl!!)
        api.setPlayerId(playerId!!)

        // Start playback
        startPlayback()
    }

    private fun startPlayback() {
        isRunning = true

        // Start background service
        val serviceIntent = Intent(this, PlayerService::class.java).apply {
            action = PlayerService.ACTION_START
            putExtra(PlayerService.EXTRA_SERVER_URL, serverUrl)
            putExtra(PlayerService.EXTRA_PLAYER_ID, playerId)
        }
        startService(serviceIntent)

        // Initial schedule fetch and start polling
        scope.launch {
            fetchAndRender()
            while (isRunning) {
                delay(PlayerService.COLLECTION_INTERVAL_MS)
                if (!isRunning) break
                fetchAndRender()
                api.sendHeartbeat()
            }
        }
    }

    private suspend fun fetchAndRender() {
        try {
            val schedule = api.fetchSchedule()

            if (schedule == null || schedule.layouts.isNullOrEmpty()) {
                showFallback("Sem agendamento")
                return
            }

            currentOverlays = schedule.overlays

            // Campaign vs single layout
            if (schedule.layouts.size > 1 && schedule.layouts[0].isCampaignItem) {
                campaignLayouts = schedule.layouts
                startCampaignCycle()
            } else {
                campaignLayouts = null
                cancelCampaignCycle()
                val layout = schedule.layouts[0]
                if (layout.layout != null) {
                    renderLayout(layout.layout!!)
                }
            }

            // Download required media
            downloadRequiredFiles()
        } catch (e: Exception) {
            showFallback("Erro: ${e.message}")
        }
    }

    private fun startCampaignCycle() {
        cancelCampaignCycle()
        campaignIndex = 0

        campaignJob = scope.launch {
            while (isRunning && campaignLayouts != null) {
                val items = campaignLayouts ?: break
                if (items.isEmpty()) break

                val item = items[campaignIndex]
                if (item.layout != null) {
                    withContext(Dispatchers.Main) {
                        renderLayout(item.layout!!)
                    }
                }

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

    private fun renderLayout(layout: LayoutData) {
        currentLayout = layout

        runOnUiThread {
            // Remove existing webview
            webView?.let { playerView.removeView(it) }
            webView = null

            val regions = try {
                val r = gson.fromJson(layout.regions, Array<Region>::class.java)
                r.toList()
            } catch (e: Exception) {
                emptyList()
            }

            // Build HTML layout
            val html = buildLayoutHtml(layout, regions)

            val wv = WebView(this@PlayerActivity).apply {
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                setBackgroundColor(Color.BLACK)
                settings.apply {
                    javaScriptEnabled = true
                    allowFileAccess = true
                    allowContentAccess = true
                    mediaPlaybackRequiresUserGesture = false
                    domStorageEnabled = true
                }
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        return false
                    }
                }
                addJavascriptInterface(MediaPathProvider(cache), "MediaProvider")
                loadDataWithBaseURL(
                    "https://signamais.local/",
                    html,
                    "text/html",
                    "UTF-8",
                    null
                )
            }

            webView = wv
            playerView.addView(wv, 0)

            // Render overlays on top
            renderOverlays()
        }
    }

    private fun renderOverlays() {
        // Remove existing overlay view
        overlayWebView?.let { playerView.removeView(it) }
        overlayWebView = null

        val overlays = currentOverlays ?: return
        if (overlays.isEmpty()) return

        val overlayLayouts = overlays.mapNotNull { it.layout }
        if (overlayLayouts.isEmpty()) return

        // Render the first overlay (simplified - just render the first active one)
        val overlayLayout = overlayLayouts[0]
        val regions = try {
            val r = gson.fromJson(overlayLayout.regions, Array<Region>::class.java)
            r.toList()
        } catch (e: Exception) {
            emptyList()
        }

        val html = buildOverlayHtml(overlayLayout, regions)

        val ov = WebView(this@PlayerActivity).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.TRANSPARENT)
            settings.apply {
                javaScriptEnabled = true
                allowFileAccess = true
                domStorageEnabled = true
            }
            setBackgroundColor(Color.TRANSPARENT)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            loadDataWithBaseURL("https://signamais.local/", html, "text/html", "UTF-8", null)
        }

        overlayWebView = ov
        playerView.addView(ov)
    }

    private fun buildLayoutHtml(layout: LayoutData, regions: List<Region>): String {
        val sb = StringBuilder()
        sb.append("""
        <!DOCTYPE html>
        <html>
        <head>
        <meta name='viewport' content='width=${layout.width}, height=${layout.height}, initial-scale=1.0'>
        <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
            width: 100%; height: 100%; overflow: hidden;
            background: ${layout.backgroundColor};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .region { position: absolute; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .region-clock { font-family: 'Courier New', monospace; font-weight: bold; }
        .region-text { padding: 16px; }
        .region-media img, .region-media video { width: 100%; height: 100%; object-fit: contain; }
        </style>
        </head>
        <body>
        """.trimIndent())

        for (region in regions) {
            sb.append("<div class='region' style='left:${region.x}px;top:${region.y}px;width:${region.width}px;height:${region.height}px;")
            when (region.type) {
                "clock" -> {
                    val size = minOf(region.width, region.height) / 5
                    val color = region.color ?: "#FF0044"
                    sb.append("color:${color};font-size:${size}px;")
                    sb.append("' class='region region-clock'")
                    sb.append("><span id='clock_${region.id}'></span></div>")
                }
                "text" -> {
                    val size = (region.fontSize ?: 48).coerceAtMost(region.height / 2)
                    val color = region.color ?: "#FFFFFF"
                    sb.append("color:${color};font-size:${size}px;")
                    sb.append("' class='region region-text'")
                    sb.append(">${region.content ?: ""}</div>")
                }
                "media" -> {
                    if (region.mediaId != null) {
                        sb.append("' class='region region-media'")
                        sb.append("><img src='${getMediaUrl(region.mediaId)}'/></div>")
                    } else {
                        sb.append("background:#333;' class='region'><span style='color:#555'>Sem mídia</span></div>")
                    }
                }
                "web" -> {
                    sb.append("background:#222;' class='region'")
                    if (region.url != null) {
                        sb.append("><iframe src='${region.url}' style='width:100%;height:100%;border:none;'></iframe></div>")
                    } else {
                        sb.append("><span style='color:#555'>URL não definida</span></div>")
                    }
                }
                else -> {
                    sb.append("background:#333;' class='region'><span style='color:#555'>${region.name}</span></div>")
                }
            }
        }

        sb.append("""
        <script>
        function updateClocks() {
            const now = new Date();
            const time = now.toLocaleTimeString('pt-BR');
            document.querySelectorAll('[id^="clock_"]').forEach(el => el.textContent = time);
        }
        updateClocks();
        setInterval(updateClocks, 1000);
        </script>
        </body>
        </html>
        """.trimIndent())

        return sb.toString()
    }

    private fun buildOverlayHtml(layout: LayoutData, regions: List<Region>): String {
        val sb = StringBuilder()
        sb.append("""
        <!DOCTYPE html>
        <html>
        <head>
        <meta name='viewport' content='width=${layout.width}, height=${layout.height}, initial-scale=1.0'>
        <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
        .overlay-region { position: absolute; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        </style>
        </head>
        <body>
        """.trimIndent())

        for (region in regions) {
            val color = region.color ?: "#FFFFFF"
            val size = if (region.type == "text") (region.fontSize ?: 48).coerceAtMost(region.height / 2) else 24
            sb.append("<div class='overlay-region' style='left:${region.x}px;top:${region.y}px;width:${region.width}px;height:${region.height}px;")
            sb.append("color:${color};font-size:${size}px;")

            when (region.type) {
                "text" -> sb.append("'>${region.content ?: ""}</div>")
                "media" -> {
                    if (region.mediaId != null) {
                        sb.append("'><img src='${getMediaUrl(region.mediaId)}' style='width:100%;height:100%;object-fit:contain;'/></div>")
                    } else {
                        sb.append("'></div>")
                    }
                }
                else -> sb.append("'></div>")
            }
        }

        sb.append("</body></html>")
        return sb.toString()
    }

    private fun getMediaUrl(mediaId: String): String {
        val server = serverUrl ?: return ""
        return "$server/api/media/$mediaId/download"
    }

    private fun showFallback(message: String) {
        runOnUiThread {
            webView?.let { playerView.removeView(it) }
            webView = null

            if (fallbackText == null) {
                fallbackText = TextView(this).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        gravity = Gravity.CENTER
                    }
                    setTextColor(Color.GRAY)
                    textSize = 18f
                }
                playerView.addView(fallbackText)
            }
            fallbackText?.text = message
            fallbackText?.visibility = View.VISIBLE
        }
    }

    private suspend fun downloadRequiredFiles() {
        try {
            val files = api.fetchRequiredFiles() ?: return
            for (mediaFile in files.files) {
                if (!cache.isMediaCached(mediaFile.fileName)) {
                    val dest = cache.cacheMedia(mediaFile.fileName)
                    api.downloadFile(mediaFile.id, dest)
                }
            }
        } catch (e: Exception) {
            // Silently fail - media will load from server if not cached
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }
    }

    override fun onDestroy() {
        isRunning = false
        cancelCampaignCycle()
        scope.cancel()

        // Stop service
        stopService(Intent(this, PlayerService::class.java))

        wakeLock?.release()
        wakeLock = null

        playerView.removeAllViews()
        webView?.destroy()
        webView = null
        overlayWebView?.destroy()
        overlayWebView = null

        super.onDestroy()
    }

    // JavaScript interface to provide cached media paths
    class MediaPathProvider(private val cache: PlayerCache) {
        @JavascriptInterface
        fun getMediaPath(fileName: String): String? {
            val file = cache.getMediaFile(fileName)
            return file?.absolutePath
        }
    }
}
