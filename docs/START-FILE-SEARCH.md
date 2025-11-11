# Startdatei-Suche Feature

## Problem

Verschiedene Minecraft-Modpacks haben unterschiedliche Startdateien:
- Manche nutzen `startserver.sh` oder `start.sh`
- Andere verwenden `run.sh`, `launch.sh` oder `ServerStart.sh`
- Windows-Server nutzen `.bat` oder `.cmd` Dateien
- Einige Modpacks haben die Startdatei in Unterordnern

## Lösung

Das neue Feature ermöglicht es, die richtige Startdatei für jedes Modpack zu finden und festzulegen.

### Funktionsweise

1. **Automatische Suche**: Durchsucht rekursiv das Server-Verzeichnis nach potenziellen Startdateien
2. **Intelligente Bewertung**: Bewertet Dateien nach Wahrscheinlichkeit (hoch/mittel/niedrig)
3. **Flexible Auswahl**: Benutzer kann die richtige Datei aus der Liste auswählen
4. **Persistente Speicherung**: Die ausgewählte Startdatei wird in den Server-Metadaten gespeichert

### Verwendung

1. Öffne die Server-Management-Seite
2. Klicke auf den 🔍 Button neben dem "Server starten" Button
3. Wähle die richtige Startdatei aus der Liste
4. Klicke auf "Startdatei festlegen"
5. Die Datei wird beim nächsten Start verwendet

### Bewertungskriterien

**Hohe Wahrscheinlichkeit (Grün)**:
- Dateiname enthält "start", "run" oder "launch"
- Beispiele: `startserver.sh`, `run.sh`, `launch.bat`

**Mittlere Wahrscheinlichkeit (Gelb)**:
- Dateiname enthält "server"
- Bekannte Server-JARs: `forge.jar`, `minecraft_server.jar`

**Niedrige Wahrscheinlichkeit (Grau)**:
- Andere `.sh`, `.bat`, `.cmd` oder `.jar` Dateien

### Technische Details

**Backend-Endpunkte**:
- `GET /api/server/find-start-files?project={projectPath}` - Sucht Startdateien
- `POST /api/server/set-start-file` - Setzt die Startdatei

**Metadaten-Feld**:
```typescript
interface ServerMetadata {
  startFile?: string; // z.B. "startserver.sh" oder "scripts/start.bat"
}
```

**Plattform-Unterstützung**:
- Unix/Linux: `.sh` Dateien mit automatischer `chmod +x`
- Windows: `.bat` und `.cmd` Dateien
- Cross-Platform: Automatische Erkennung des Betriebssystems

### Fallback-Verhalten

Wenn keine Startdatei festgelegt ist, wird standardmäßig `startserver.sh` verwendet (für Abwärtskompatibilität).
