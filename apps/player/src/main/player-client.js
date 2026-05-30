const axios = require('axios');
const { io } = require('socket.io-client');
const path = require('path');
const fs = require('fs');
const os = require('os');

class PlayerClient {
  constructor() {
    this.serverUrl = null;
    this.playerId = null;
    this.apiKey = null;
    this.socket = null;
    this.interval = null;
    this.collectionIntervalMs = 30000; // 30s polling
    this.cacheDir = path.join(os.homedir(), '.signamais-cache');
    this.status = { paired: false, running: false, currentLayouts: [], currentOverlays: [] };
    this.onLayoutUpdate = null;
    this.onScheduleUpdate = null;
    this.campaignTimer = null;
    this.currentCampaignIndex = 0;

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Pair the player with the server
   */
  async pair(serverUrl, pairingCode) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    
    try {
      // Validate inputs
      if (!this.serverUrl) throw new Error('URL do servidor não informada');
      if (!pairingCode) throw new Error('Código de pareamento não informado');

      // Check server connectivity first
      try {
        await axios.get(`${this.serverUrl}/api/queue/status`, { timeout: 5000 });
      } catch (connErr) {
        throw new Error(
          `Servidor inacessível em ${this.serverUrl}. ` +
          `Verifique a URL e se o servidor está rodando.`
        );
      }

      const res = await axios.post(`${this.serverUrl}/api/players`, {}, {
        headers: { Authorization: `Bearer ${pairingCode}` },
      });

      if (!res.data || !res.data.id) {
        throw new Error('Código de pareamento inválido ou recusado pelo servidor');
      }

      const regRes = await axios.post(`${this.serverUrl}/api/player/register`, {}, {
        headers: { 'x-player-id': res.data.id },
      });

      if (regRes.data.success) {
        this.playerId = res.data.id;
        this.status.paired = true;
        this.saveConfig();
        this.connectWebSocket();
        this.startPolling();
        return { success: true, playerId: this.playerId };
      }
      
      throw new Error('Falha ao registrar player — resposta inesperada do servidor');
    } catch (err) {
      if (err.message && (err.message.includes('Servidor inacessível') ||
          err.message.includes('Código de pareamento') ||
          err.message.includes('Falha ao registrar'))) {
        throw err;
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        throw new Error(
          `Não foi possível conectar ao servidor ${this.serverUrl}. ` +
          `Verifique se o endereço está correto e o servidor está rodando.`
        );
      }
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error('Código de pareamento inválido. Verifique e tente novamente.');
      }
      throw new Error(`Erro ao parear: ${err.response?.data?.message || err.message}`);
    }
  }


  /**
   * Connect to WebSocket for real-time commands
   */
  connectWebSocket() {
    if (this.socket) this.socket.disconnect();

    this.socket = io(`${this.serverUrl}/ws`, {
      query: { playerId: this.playerId },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('[WS] Conectado ao servidor');
    });

    this.socket.on('command', async (data) => {
      console.log('[WS] Comando recebido:', data.command);
      
      switch (data.command) {
        case 'screenshot':
          if (this.onScreenshotRequest) this.onScreenshotRequest();
          break;
        case 'schedule_update':
          this.fetchSchedule();
          break;
        case 'restart':
          this.restart();
          break;
        default:
          console.log('[WS] Comando desconhecido:', data.command);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[WS] Desconectado do servidor');
    });
  }

  /**
   * Start periodic polling
   */
  startPolling() {
    if (this.interval) clearInterval(this.interval);
    
    // Initial fetch
    this.fetchSchedule();
    this.sendHeartbeat();
    
    // Periodic polling
    this.interval = setInterval(() => {
      this.fetchSchedule();
      this.sendHeartbeat();
    }, this.collectionIntervalMs);
  }

  /**
   * Stop polling
   */
  stop() {
    if (this.interval) clearInterval(this.interval);
    if (this.socket) this.socket.disconnect();
    if (this.campaignTimer) clearTimeout(this.campaignTimer);
  }

  /**
   * Fetch current schedule from server (supports campaigns + overlays)
   */
  async fetchSchedule() {
    try {
      const res = await axios.get(`${this.serverUrl}/api/player/schedule`, {
        headers: { 'x-player-id': this.playerId },
      });

      const data = res.data;

      // Handle new format: layouts array + overlays
      if (data.layouts && data.layouts.length > 0) {
        this.status.currentLayouts = data.layouts;
        this.status.currentOverlays = data.overlays || [];
        
        // Download required files
        await this.downloadRequiredFiles();
        
        // Notify renderer with the full schedule
        if (this.onScheduleUpdate) {
          this.onScheduleUpdate({
            layouts: data.layouts,
            overlays: data.overlays,
            isDefault: data.isDefault,
          });
        }
        
        // If it's a campaign, start cycling
        if (data.layouts.length > 1 && data.layouts[0].isCampaignItem) {
          this.startCampaignCycle(data.layouts);
        } else {
          // Single layout - show it
          this.currentCampaignIndex = 0;
          if (this.campaignTimer) clearTimeout(this.campaignTimer);
          if (this.onLayoutUpdate) {
            this.onLayoutUpdate(data.layouts[0].layout);
          }
        }
      } else {
        // No active schedule
        this.status.currentLayouts = [];
        this.status.currentOverlays = [];
        if (this.onScheduleUpdate) {
          this.onScheduleUpdate({ layouts: [], overlays: [], isDefault: false });
        }
      }
    } catch (err) {
      console.error('[Poll] Erro ao buscar schedule:', err.message);
    }
  }

  /**
   * Start cycling through campaign layouts
   */
  startCampaignCycle(layouts) {
    if (this.campaignTimer) clearTimeout(this.campaignTimer);

    const showNext = () => {
      if (!this.status.running) return;
      
      const item = layouts[this.currentCampaignIndex];
      if (!item) return;

      console.log(`[Campaign] Exibindo layout ${this.currentCampaignIndex + 1}/${layouts.length}: ${item.layout?.name}`);

      if (this.onLayoutUpdate) {
        this.onLayoutUpdate(item.layout);
      }

      const duration = (item.duration || 10) * 1000;
      this.currentCampaignIndex = (this.currentCampaignIndex + 1) % layouts.length;
      this.campaignTimer = setTimeout(showNext, duration);
    };

    showNext();
  }

  /**
   * Download required media files (handles campaign + overlay layouts)
   */
  async downloadRequiredFiles() {
    try {
      const res = await axios.get(`${this.serverUrl}/api/player/required-files`, {
        headers: { 'x-player-id': this.playerId },
      });

      const files = res.data.files || [];
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file.fileName);
        
        // Only download if not cached
        if (!fs.existsSync(filePath)) {
          console.log(`[Download] Baixando: ${file.name}`);
          
          const fileRes = await axios.get(
            `${this.serverUrl}/api/player/file/${file.id}`,
            { headers: { 'x-player-id': this.playerId }, responseType: 'stream' }
          );
          
          const writer = fs.createWriteStream(filePath);
          fileRes.data.pipe(writer);
          
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        }
      }
    } catch (err) {
      console.error('[Download] Erro:', err.message);
    }
  }

  /**
   * Send heartbeat to server
   */
  async sendHeartbeat() {
    try {
      await axios.post(`${this.serverUrl}/api/player/status`, {
        status: 'online',
        version: '0.2.0',
        os: `${os.platform()} ${os.release()}`,
      }, {
        headers: { 'x-player-id': this.playerId },
      });
    } catch (err) {
      console.error('[Heartbeat] Erro:', err.message);
    }
  }

  /**
   * Send proof of play
   */
  async sendStats(stats) {
    try {
      await axios.post(`${this.serverUrl}/api/player/stats`, { stats }, {
        headers: { 'x-player-id': this.playerId },
      });
    } catch (err) {
      console.error('[Stats] Erro:', err.message);
    }
  }

  /**
   * Save player config for auto-reconnect
   */
  saveConfig() {
    const config = {
      serverUrl: this.serverUrl,
      playerId: this.playerId,
    };
    fs.writeFileSync(
      path.join(this.cacheDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );
  }

  /**
   * Load saved config
   */
  loadConfig() {
    const configPath = path.join(this.cacheDir, 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return null;
  }

  /**
   * Get current player status
   */
  getStatus() {
    return {
      paired: this.status.paired,
      running: this.status.running,
      playerId: this.playerId,
      serverUrl: this.serverUrl,
      currentLayouts: this.status.currentLayouts,
      currentOverlays: this.status.currentOverlays,
    };
  }

  restart() {
    console.log('[Player] Reiniciando...');
    this.stop();
    this.startPolling();
  }

  start() {
    this.status.running = true;
  }
}

module.exports = PlayerClient;
