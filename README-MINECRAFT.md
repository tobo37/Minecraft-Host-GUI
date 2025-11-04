# Minecraft Server Dev Container

Dieser Dev Container enthält alles, was du brauchst, um einen Minecraft Server zu entwickeln und zu betreiben.

## Enthaltene Software

- **Java 21** - Für den Minecraft Server
- **Bun** - JavaScript/TypeScript Runtime und Package Manager
- **Node.js 20** - Für zusätzliche Web-Entwicklung
- **Screen** - Für persistente Server-Sessions
- **Weitere Tools**: htop, curl, wget, unzip

## Minecraft Server Setup

1. **Server JAR herunterladen:**
   ```bash
   cd minecraft-server
   wget https://piston-data.mojang.com/v1/objects/[VERSION_HASH]/server.jar
   ```
   
   Oder lade die neueste Version von https://www.minecraft.net/en-us/download/server herunter.

2. **Server starten:**
   ```bash
   ./start-minecraft-server.sh
   ```

3. **Server in Screen-Session starten (empfohlen):**
   ```bash
   screen -S minecraft
   ./start-minecraft-server.sh
   # Zum Detachen: Ctrl+A, dann D
   # Zum Wiederanhängen: screen -r minecraft
   ```

## Ports

- **25565** - Minecraft Server (automatisch weitergeleitet)
- **3000** - Web-Anwendung (automatisch weitergeleitet)

## Bun Verwendung

```bash
# Bun ist bereits installiert und verfügbar
bun --version

# Projekt initialisieren
bun init

# Dependencies installieren
bun install

# Script ausführen
bun run dev
```

## Server-Konfiguration

Die Server-Dateien werden im `minecraft-server` Verzeichnis gespeichert und sind persistent zwischen Container-Neustarts.

### Wichtige Dateien:
- `server.properties` - Server-Konfiguration
- `eula.txt` - EULA Akzeptanz (wird automatisch erstellt)
- `world/` - Welt-Daten
- `logs/` - Server-Logs