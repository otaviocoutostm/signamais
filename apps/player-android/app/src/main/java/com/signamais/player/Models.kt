package com.signamais.player

import com.google.gson.annotations.SerializedName

// ========== API Models ==========

data class RegisterResponse(
    val success: Boolean,
    val playerId: String?,
    val name: String?,
    val message: String?
)

data class PlayerRegisterRequest(
    val name: String,
    val pairingCode: String
)

data class ScheduleResponse(
    val scheduleId: String?,
    val layouts: List<LayoutItem>?,
    val overlays: List<OverlayItem>?,
    val isDefault: Boolean = false,
    val message: String?
)

data class LayoutItem(
    val layoutId: String,
    val layout: LayoutData?,
    val duration: Int?,
    val isCampaignItem: Boolean = false,
    val campaignId: String?,
    val displayOrder: Int?
)

data class OverlayItem(
    val overlayId: String,
    val layoutId: String,
    val layout: LayoutData?,
    val priority: Int = 0
)

data class LayoutData(
    val id: String,
    val name: String,
    val width: Int = 1920,
    val height: Int = 1080,
    val backgroundColor: String = "#000000",
    val regions: String = "[]"
)

data class Region(
    val id: String = "",
    val name: String = "Região",
    val x: Int = 0,
    val y: Int = 0,
    val width: Int = 1920,
    val height: Int = 1080,
    val type: String = "media",
    val mediaId: String? = null,
    val content: String? = null,
    val fontSize: Int? = null,
    val color: String? = null,
    val url: String? = null
)

data class RequiredFilesResponse(
    val files: List<MediaFile>,
    val layoutId: String?
)

data class MediaFile(
    val id: String,
    val name: String,
    val fileName: String,
    val mimeType: String,
    val width: Int?,
    val height: Int?
)

data class PlayerStatusRequest(
    val status: String,
    val version: String,
    val os: String
)

data class ProofOfPlayEntry(
    val layoutId: String,
    val mediaId: String?,
    val startedAt: String,
    val endedAt: String?,
    val duration: Int?
)

data class LogEntry(
    val level: String,
    val message: String
)

// ========== WebSocket Models ==========

data class WsCommand(
    val command: String
)
