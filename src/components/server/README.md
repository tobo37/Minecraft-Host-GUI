# Server Management Components

Diese Komponenten bilden das Server-Management-Modul der Minecraft Server Management Interface.

## Architektur-Übersicht

Die Server-Management-Funktionalität wurde nach Clean Code Prinzipien in mehrere spezialisierte Module aufgeteilt:

### Komponenten-Hierarchie

```
ServerManagement (Container)
  ├── ServerOverview (Haupt-UI)
  │   ├── ServerHeader
  │   ├── ServerInfoCard
  │   ├── ServerControls
  │   ├── ServerLogs
  │   ├── RenameDialog
  │   ├── DeleteDialog
  │   └── StartFileDialog
  ├── ConfigurationManagement
  └── JavaManagement
```

## Komponenten

### ServerManagement.tsx
**Verantwortlichkeit**: Container-Komponente und View-Router
- Verwaltet den aktuellen View-State (overview, configuration, java)
- Orchestriert alle Custom Hooks
- Leitet Props an die entsprechenden Views weiter
- Keine UI-Logik, nur Koordination

### ServerOverview.tsx
**Verantwortlichkeit**: Haupt-UI für die Server-Übersicht
- Rendert alle UI-Komponenten für die Server-Verwaltung
- Verbindet UI-Events mit Hook-Funktionen
- Verwaltet Dialog-States
- Keine Business-Logik, nur Präsentation

### ServerHeader.tsx
**Verantwortlichkeit**: Server-Kopfzeile mit Name und Java-Button

### ServerInfoCard.tsx
**Verantwortlichkeit**: Anzeige von Server-Informationen und Beschreibung

### ServerControls.tsx
**Verantwortlichkeit**: Start/Stop-Buttons und Konfiguration

### ServerLogs.tsx
**Verantwortlichkeit**: Echtzeit-Log-Anzeige

### Dialoge
- **RenameDialog.tsx**: Server umbenennen
- **DeleteDialog.tsx**: Server löschen mit Bestätigung
- **StartFileDialog.tsx**: Startdatei auswählen

## Custom Hooks

Die gesamte Business-Logik wurde in spezialisierte Custom Hooks ausgelagert:

### useServerInfo
**Zweck**: Server-Metadaten laden und verwalten
- Lädt Server-Informationen beim Mount
- Bietet `refetch()` Funktion für manuelle Updates
- Verwaltet Loading-State

### useServerStatus
**Zweck**: Server-Status und Logs verwalten
- Überwacht Server-Status (running, stopped, starting, stopping)
- Pollt Server-Logs im Intervall
- Bietet Start/Stop-Funktionen

### useServerMetadata
**Zweck**: Server-Name ändern
- Validiert Namen (alphanumerisch, Leerzeichen, Bindestriche)
- Verwaltet Rename-Dialog-State
- Speichert neuen Namen via API

### useServerDescription
**Zweck**: Server-Beschreibung bearbeiten
- Verwaltet Edit-Mode
- Speichert Beschreibung via API
- Bietet Cancel-Funktionalität

### useServerDelete
**Zweck**: Server löschen
- Verwaltet Delete-Dialog-State
- Validiert Bestätigungs-Namen
- Führt Löschvorgang aus

### useStartFile
**Zweck**: Startdatei suchen und setzen
- Sucht nach möglichen Startdateien
- Zeigt Kandidaten mit Confidence-Level
- Speichert ausgewählte Startdatei

## Vorteile dieser Architektur

### Separation of Concerns
- UI-Komponenten enthalten nur Präsentationslogik
- Business-Logik ist in Hooks gekapselt
- Jede Komponente hat eine klare Verantwortlichkeit

### Wiederverwendbarkeit
- Hooks können in anderen Komponenten wiederverwendet werden
- UI-Komponenten sind unabhängig testbar
- Klare Schnittstellen zwischen Modulen

### Wartbarkeit
- Änderungen an Business-Logik betreffen nur Hooks
- UI-Änderungen betreffen nur Komponenten
- Einfaches Auffinden von Code durch klare Struktur

### Testbarkeit
- Hooks können isoliert getestet werden
- Komponenten können mit Mock-Props getestet werden
- Klare Abhängigkeiten erleichtern Mocking

## Verwendung

```typescript
import { ServerManagement } from "@/components/ServerManagement";

<ServerManagement 
  projectPath="/path/to/server"
  onBack={() => console.log("Back clicked")}
/>
```

## Datenfluss

1. **ServerManagement** initialisiert alle Hooks mit `projectPath`
2. Hooks laden Daten und bieten Callback-Funktionen
3. **ServerOverview** erhält alle Daten und Callbacks als Props
4. UI-Events triggern Hook-Callbacks
5. Hooks aktualisieren State und rufen `onSuccess` Callbacks auf
6. `refetch()` wird aufgerufen, um Daten zu aktualisieren
