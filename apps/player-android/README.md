# SignaMais — Player Android 🖥️

## Estrutura do Projeto

```
player-android/
├── build.gradle.kts          # Build do módulo (dependências)
├── settings.gradle.kts       # Config do projeto
├── gradle/wrapper/           # Gradle wrapper
└── app/src/main/
    ├── AndroidManifest.xml   # Permissões e Activities
    ├── java/com/signamais/player/
    │   ├── Models.kt         # Modelos de dados (API, WS, cache)
    │   ├── api/
    │   │   ├── SignaMaisApi.kt       # Cliente HTTP (OkHttp)
    │   │   └── PlayerWebSocket.kt    # WebSocket para comandos
    │   ├── cache/
    │   │   └── PlayerCache.kt        # Cache de mídia local
    │   ├── player/
    │   │   └── PlayerService.kt      # Serviço em background
    │   └── ui/
    │       ├── PairingActivity.kt    # Tela de pareamento inicial
    │       └── PlayerActivity.kt     # Player fullscreen (WebView)
    └── res/
        ├── layout/activity_pairing.xml
        └── values/themes.xml
```

## Funcionalidades

| Funcionalidade | Status |
|---|---|
| Pareamento com código | ✅ |
| Heartbeat periódico | ✅ |
| Fetch de schedule | ✅ |
| Renderização de layouts (WebView) | ✅ |
| Suporte a regiões (imagem, texto, relógio) | ✅ |
| Campanhas (ciclo automático) | ✅ |
| Overlays (layouts sobrepostos) | ✅ |
| Download de mídia em cache | ✅ |
| WebSocket (comandos remotos) | ✅ |
| Tela cheia / Kiosk mode | ✅ |
| Fallback (sem agendamento) | ✅ |

## Como Buildar

### Pré-requisitos
- Android Studio (Arctic Fox ou superior)
- JDK 17
- Android SDK 34

### Passos
1. Abra a pasta `player-android` no Android Studio
2. Sincronize o Gradle
3. Conecte um Fire Stick / Android TV / Tablet
4. Execute `Run` (▶️)

### APK Release
```bash
cd player-android
./gradlew assembleRelease
# APK em: app/build/outputs/apk/release/app-release.apk
```

## Como Usar

1. No CMS (SignaMais Web), vá em **Players** → **Adicionar Player**
2. Copie o **código de pareamento** gerado (ex: `R5DZ9Z`)
3. No app Android, digite a URL do servidor e o código
4. Toque em **PAREAR**
5. O player entra em modo tela cheia e começa a reproduzir

## Compatibilidade

| Dispositivo | Suporte |
|---|---|
| Fire TV Stick 4K | ✅ Testado |
| Fire TV Stick Lite | ✅ |
| Android TV (Sony, TCL, etc.) | ✅ |
| Tablets Android | ✅ |
| Smartphones Android | ✅ (modo paisagem) |
| Minix / TV Box | ✅ |
