# Minecraft Server Management - Detaillierte Anleitung

Diese Anwendung bietet eine vollständige Web-Oberfläche zur Verwaltung von Minecraft-Servern mit persistenter Datenspeicherung.

## Container-Setup mit persistenten Daten

### Schnellstart

```bash
# 1. Repository klonen
git clone <repository-url>
cd minecraft-server-manager

# 2. Server-Ordner erstellen (falls nicht vorhanden)
mkdir -p server

# 3. Docker Image bauen
docker build -t minecraft-manager .

# 4. Container mit persistenten Daten starten
docker run -d \
  --name minecraft-manager \
  -p 3000:3000 \
  -p 25565:25565 \
  -v $(pwd)/server:/app/server \
  --restart unless-stopped \
  minecraft-manager
```

### Wichtige Volume-Bindung

Der Parameter `-v $(pwd)/server:/app/server` ist **essentiell**:
- Bindet den lokalen `./server` Ordner an den Container-Pfad `/app/server`
- Alle Minecraft-Server-Daten (Welten, Konfigurationen, Plugins) bleiben erhalten
- Server überleben Container-Neustarts, Updates und Rebuilds

## Lokale Entwicklung

### Voraussetzungen
- [Bun](https://bun.sh) v1.1.34+
- Java 21 (für Minecraft-Server)

### Setup

```bash
# Dependencies installieren
bun install

# Entwicklungsserver starten (Hot-Reload)
bun dev

# Produktionsserver starten
bun start
```

## Minecraft Server Konfiguration

### Erste Schritte

1. **Web-Interface öffnen**: `http://localhost:3000`
2. **Neuen Server erstellen** oder **existierenden auswählen**
3. **EULA akzeptieren** (erforderlich für ersten Start)
4. **Server-Eigenschaften konfigurieren**
5. **Server starten**

### Wichtige Konfigurationsdateien

| Datei | Beschreibung | Erstellt |
|-------|-------------|----------|
| `eula.txt` | Minecraft EULA Akzeptanz | Beim ersten Start |
| `server.properties` | Haupt-Server-Konfiguration | Beim ersten Start |
| `user_jvm_args.txt` | JVM-Speicher und Performance | Manuell |
| `whitelist.json` | Spieler-Whitelist | Bei Aktivierung |
| `ops.json` | Server-Operatoren | Bei Bedarf |
| `banned-players.json` | Gesperrte Spieler | Bei Bedarf |

### Empfohlene JVM-Argumente

Für optimale Performance erstelle `user_jvm_args.txt`:

```bash
# Für 4GB RAM
-Xms2G -Xmx4G

# Für 8GB RAM  
-Xms4G -Xmx8G

# Performance-Optimierungen
-XX:+UseG1GC
-XX:+ParallelRefProcEnabled
-XX:MaxGCPauseMillis=200
-XX:+UnlockExperimentalVMOptions
-XX:+DisableExplicitGC
-XX:+AlwaysPreTouch
-XX:G1NewSizePercent=30
-XX:G1MaxNewSizePercent=40
-XX:G1HeapRegionSize=8M
-XX:G1ReservePercent=20
-XX:G1HeapWastePercent=5
-XX:G1MixedGCCountTarget=4
-XX:InitiatingHeapOccupancyPercent=15
-XX:G1MixedGCLiveThresholdPercent=90
-XX:G1RSetUpdatingPauseTimePercent=5
-XX:SurvivorRatio=32
-XX:+PerfDisableSharedMem
-XX:MaxTenuringThreshold=1
```

## Features der Web-Oberfläche

### Server-Management
- ✅ **Start/Stop**: Server mit einem Klick starten/stoppen
- 📊 **Live-Logs**: Echtzeit-Anzeige mit Syntax-Highlighting
- 📈 **Status-Monitoring**: Aktueller Server-Status und Performance
- 🔄 **Auto-Restart**: Automatischer Neustart bei Crashes

### Konfiguration
- ⚙️ **Visual Editor**: Bearbeitung aller Config-Dateien über Web-UI
- 🎮 **Game Settings**: Spielmodus, Schwierigkeit, Spieleranzahl
- 🌍 **World Settings**: Welt-Generator, Seed, Strukturen
- 👥 **Player Management**: Whitelist, Ops, Bans
- 🔧 **Performance Tuning**: JVM-Argumente, Server-Optimierungen

### Multi-Projekt Support
- 📁 **Projekt-Verwaltung**: Mehrere Server-Instanzen verwalten
- 🔀 **Schneller Wechsel**: Zwischen verschiedenen Servern wechseln
- 📋 **Projekt-Übersicht**: Status aller Server auf einen Blick

## Ports und Netzwerk

| Port | Service | Beschreibung |
|------|---------|-------------|
| 3000 | Web-UI | Management-Interface |
| 25565 | Minecraft | Standard Minecraft-Server Port |

### Zusätzliche Ports (bei Bedarf)

```bash
# Für mehrere Server oder andere Ports
docker run -d \
  --name minecraft-manager \
  -p 3000:3000 \
  -p 25565:25565 \
  -p 25566:25566 \
  -p 25567:25567 \
  -v $(pwd)/server:/app/server \
  minecraft-manager
```

## Backup und Wartung

### Automatisches Backup

```bash
# Backup-Skript erstellen
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backup_minecraft_${DATE}.tar.gz" server/
```

### Container-Updates

```bash
# 1. Container stoppen
docker stop minecraft-manager

# 2. Neues Image bauen
docker build -t minecraft-manager .

# 3. Alten Container entfernen
docker rm minecraft-manager

# 4. Neuen Container starten (Daten bleiben erhalten!)
docker run -d \
  --name minecraft-manager \
  -p 3000:3000 \
  -p 25565:25565 \
  -v $(pwd)/server:/app/server \
  --restart unless-stopped \
  minecraft-manager
```

## Troubleshooting

### Häufige Probleme

1. **Server startet nicht**: Prüfe EULA-Akzeptanz und Java-Version
2. **Keine Verbindung**: Firewall-Einstellungen für Port 25565 prüfen
3. **Speicher-Fehler**: JVM-Argumente anpassen (mehr RAM zuweisen)
4. **Daten verloren**: Volume-Bindung `-v $(pwd)/server:/app/server` prüfen

### Logs einsehen

```bash
# Container-Logs
docker logs minecraft-manager

# Minecraft-Server-Logs (über Web-UI oder direkt)
tail -f server/[projekt-name]/logs/latest.log
```

## Erweiterte Konfiguration

### Plugins und Mods
- Plugins in `server/[projekt]/plugins/` ablegen
- Server neustarten über Web-Interface
- Plugin-Konfigurationen über Config-Editor bearbeiten

### Welt-Import
- Welt-Ordner in `server/[projekt]/` kopieren
- `server.properties` entsprechend anpassen
- Server über Web-Interface neustarten