package com.signamais.player.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.signamais.player.R
import com.signamais.player.api.SignaMaisApi
import com.signamais.player.cache.PlayerCache
import kotlinx.coroutines.*

class PairingActivity : AppCompatActivity() {

    private lateinit var cache: PlayerCache
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pairing)

        cache = PlayerCache(this)

        val serverUrlInput = findViewById<EditText>(R.id.serverUrlInput)
        val pairingCodeInput = findViewById<EditText>(R.id.pairingCodeInput)
        val pairButton = findViewById<Button>(R.id.pairButton)
        val statusText = findViewById<TextView>(R.id.statusText)

        // Check for saved config
        val config = cache.loadConfig()
        if (config != null && config.serverUrl != null && config.playerId != null) {
            serverUrlInput.setText(config.serverUrl)
            // Try to reconnect
            startPlayer(config.serverUrl, config.playerId)
            return
        }

        pairButton.setOnClickListener {
            val serverUrl = serverUrlInput.text.toString().trim()
            val pairingCode = pairingCodeInput.text.toString().trim()

            if (serverUrl.isEmpty() || pairingCode.isEmpty()) {
                Toast.makeText(this, "Preencha servidor e código de pareamento", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            statusText.text = "Conectando..."
            pairButton.isEnabled = false

            scope.launch {
                pair(serverUrl, pairingCode, statusText, pairButton)
            }
        }
    }

    private suspend fun pair(serverUrl: String, pairingCode: String,
                             statusText: TextView, pairButton: Button) {
        try {
            val api = SignaMaisApi(serverUrl)

            withContext(Dispatchers.Main) {
                statusText.text = "Registrando player..."
            }

            val result = api.registerPlayer("Player Android", pairingCode)

            withContext(Dispatchers.Main) {
                if (result.success && result.playerId != null) {
                    statusText.text = "✅ Pareado com sucesso!"
                    cache.saveConfig(serverUrl, result.playerId)
                    startPlayer(serverUrl, result.playerId)
                } else {
                    statusText.text = "❌ Erro: ${result.message ?: "Falha ao parear"}"
                    pairButton.isEnabled = true
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                statusText.text = "❌ Erro de conexão: ${e.message}"
                pairButton.isEnabled = true
            }
        }
    }

    private fun startPlayer(serverUrl: String, playerId: String) {
        val intent = Intent(this, PlayerActivity::class.java).apply {
            putExtra(PlayerActivity.EXTRA_SERVER_URL, serverUrl)
            putExtra(PlayerActivity.EXTRA_PLAYER_ID, playerId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
