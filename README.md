# Minecraft Server Management Interface

Eine moderne Web-Anwendung zur Verwaltung von Minecraft-Servern, gebaut mit Bun, React, TypeScript und Tailwind CSS.

## Features

- 🎮 **Server-Management**: Starten, stoppen und überwachen von Minecraft-Servern
- ⚙️ **Konfiguration**: Bearbeitung von Server-Konfigurationsdateien über eine intuitive Web-Oberfläche
- 📊 **Live-Logs**: Echtzeit-Anzeige der Server-Logs mit farblicher Hervorhebung
- 🌍 **Multi-Language**: Unterstützung für Deutsch und Englisch
- 📁 **Projekt-Management**: Verwaltung mehrerer Server-Projekte
- 🔧 **Persistente Daten**: Server-Daten überleben Container-Neustarts

## Lokale Entwicklung

### Voraussetzungen
- [Bun](https://bun.sh) (v1.1.34 oder höher)
- Java 21 (für Minecraft-Server)

### Installation und Start

```bash
# Dependencies installieren
bun install

# Entwicklungsserver starten
bun dev

# Für Produktion
bun start
```

Die Anwendung läuft standardmäßig auf `http://localhost:3000`.

## Container-Deployment

### Docker Image bauen

```bash
docker build -t minecraft-server-manager .
```

### Container starten

```bash
# Mit persistentem Server-Ordner
docker run -d \
  --name minecraft-manager \
  -p 3000:3000 \
  -p 25565:25565 \
  -v $(pwd)/server:/app/server \
  minecraft-server-manager
```

**Wichtig**: Der `-v $(pwd)/server:/app/server` Mount sorgt dafür, dass alle Server-Daten (Welten, Konfigurationen, etc.) auch nach Container-Neustarts erhalten bleiben.

### Ports

- **3000**: Web-Interface
- **25565**: Standard Minecraft-Server Port

## Projektstruktur

```
├── src/
│   ├── components/          # React-Komponenten
│   │   ├── ServerManagement.tsx
│   │   └── ConfigurationManagement.tsx
│   ├── hooks/              # Custom React Hooks
│   └── lib/                # Utilities und i18n
├── server/                 # Persistente Server-Daten
├── dockerfile              # Container-Konfiguration
└── build.ts               # Build-Skript
```

## Technologie-Stack

- **Runtime**: Bun
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Bun Server
- **Container**: Docker mit Java 21 + Bun

---

Weitere Details zur Minecraft-Server-Konfiguration findest du in der [README-MINECRAFT.md](./README-MINECRAFT.md).
