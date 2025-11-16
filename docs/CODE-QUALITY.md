# Code Quality Guide

## Linting

Das Projekt verwendet ESLint mit TypeScript, React und React Hooks Plugins.

### Befehle

```bash
# Alle Dateien prüfen
bun lint

# Automatisch behebbare Probleme fixen
bun lint:fix
```

### Aktuelle Regeln

#### Datei- und Funktionsgröße
- **Max. 300 Zeilen pro Datei** (ohne Leerzeilen/Kommentare)
- **Max. 50 Zeilen pro Funktion**
- **Max. 4 Parameter pro Funktion**

#### Komplexität
- **Zyklomatische Komplexität ≤ 10**
- **Max. Verschachtelungstiefe: 3**

#### Code-Qualität
- Keine `any` Types (Warnung)
- Keine ungenutzten Variablen (Warnung)
- `console.log` vermeiden (nur `console.warn` und `console.error` erlaubt)
- `===` statt `==` verwenden
- `const` bevorzugen, `var` verboten

## Refactoring-Prioritäten

Basierend auf dem aktuellen Lint-Report sollten folgende Dateien refactored werden:

### Kritisch (>300 Zeilen)
1. `src/components/WelcomePage.tsx` (522 Zeilen)
2. `src/services/serverService.ts` (588 Zeilen)
3. `src/services/serverFileService.ts` (401 Zeilen)
4. `src/components/JavaManagement.tsx` (319 Zeilen)

### Hohe Priorität (Komplexe Funktionen)
- `serverService.ts`: `startServer()` - Komplexität 25
- `serverService.ts`: `createServer()` - Komplexität 21
- `serverFileService.ts`: `uploadServerFileStream()` - Komplexität 20
- `serverFileService.ts`: `uploadServerFileChunked()` - Komplexität 18

## Architektur-Prinzipien

### Layered Architecture (Schichtenmodell)

Das Projekt folgt einer klaren Schichtenarchitektur:

#### Frontend (React)
```
src/
├── pages/              # Route-Komponenten (WelcomePage, etc.)
├── features/           # Feature-Module (server/, java/, config/)
│   └── server/
│       ├── ServerOverview.tsx
│       ├── ServerControls.tsx
│       └── useServerStatus.ts
├── components/ui/      # Wiederverwendbare UI-Komponenten
├── hooks/             # Shared Custom Hooks
└── services/          # API-Kommunikation
```

#### Backend (Bun)
```
src/
├── index.ts           # Routes/Controllers (dünn, nur HTTP-Handling)
├── services/          # Business Logic
│   ├── serverService.ts
│   └── configService.ts
└── repositories/      # Datenzugriff (geplant)
```

### Separation of Concerns

**Frontend:**
- **Pages**: Routen-Komponenten, fügen Features zusammen
- **Features**: Komplexe Module mit eigener Logik
- **Components**: Dumme, wiederverwendbare UI-Elemente
- **Services**: API-Calls, kein direktes `fetch` in Komponenten

**Backend:**
- **Routes**: HTTP-Handling, Validierung (< 30 Zeilen)
- **Services**: Geschäftslogik, koordiniert Aktionen
- **Repositories**: Datenzugriff (Dateisystem, DB)

## Empfohlene Refactorings

### 1. WelcomePage.tsx aufteilen (522 → ~150 Zeilen)
```
features/welcome/
├── WelcomePage.tsx          # Hauptkomponente (Layout)
├── ServerFileUpload.tsx     # Upload-Formular
├── ServerFileList.tsx       # Liste der Server-Dateien
├── useServerFileUpload.ts   # Upload-Logik Hook
└── welcome.types.ts         # Type definitions
```

**Vorteile:**
- Jede Komponente < 150 Zeilen
- Testbarkeit verbessert
- Wiederverwendbarkeit erhöht

### 2. serverService.ts modularisieren (588 → ~150 Zeilen pro Datei)
```
services/server/
├── index.ts                # Public API (re-exports)
├── serverList.ts           # listServers()
├── serverCreate.ts         # createServer()
├── serverLifecycle.ts      # startServer(), stopServer()
├── serverRepository.ts     # Dateisystem-Zugriff
└── server.types.ts         # Shared types
```

**Vorteile:**
- Single Responsibility per Datei
- Einfachere Navigation
- Bessere Wartbarkeit

### 3. serverFileService.ts aufteilen (401 → ~150 Zeilen)
```
services/serverFile/
├── index.ts                    # Public API
├── serverFileList.ts           # List operations
├── serverFileUpload.ts         # Upload (standard)
├── serverFileUploadChunked.ts  # Chunked upload
├── serverFileUploadStream.ts   # Stream upload
└── serverFile.types.ts         # Types
```

### 4. Komplexe Funktionen vereinfachen

**Strategie:**
- Extrahiere Validierungslogik in separate Funktionen
- Nutze Early Returns statt tiefer Verschachtelung
- Teile lange Funktionen in kleinere, fokussierte Funktionen
- Maximal 3 Verschachtelungsebenen

**Beispiel:**
```typescript
// ❌ Vorher: Komplexität 25, 100+ Zeilen
async function startServer(serverName: string) {
  // Validierung
  // Konfiguration laden
  // Java prüfen
  // Prozess starten
  // Logging
  // Error Handling
}

// ✅ Nachher: Aufgeteilt
async function startServer(serverName: string) {
  await validateServerName(serverName);
  const config = await loadServerConfig(serverName);
  await ensureJavaInstalled(config.javaVersion);
  const process = await launchServerProcess(serverName, config);
  await logServerStart(serverName);
  return process;
}
```

## Best Practices

### Vor dem Commit
```bash
# 1. Linting prüfen
bun lint

# 2. Auto-fixes anwenden
bun lint:fix

# 3. Verbleibende Fehler manuell beheben
```

### Bei neuen Features

#### Frontend
- Halte Komponenten unter 150 Zeilen
- Extrahiere komplexe Logik in Custom Hooks
- **Niemals `fetch` direkt in Komponenten** - nutze Services
- Trenne "dumme" UI-Komponenten von "smarten" Container-Komponenten
- Verwende Feature-basierte Ordnerstruktur

#### Backend
- Route Handler < 30 Zeilen (nur HTTP-Handling)
- Geschäftslogik in Services auslagern
- Datenzugriff in Repositories isolieren
- Middleware für wiederverwendbare Logik

#### Allgemein
- Funktionen < 30 Zeilen
- Maximal 4 Parameter (sonst Objekt verwenden)
- Verschachtelung ≤ 3 Ebenen
- Aussagekräftige Namen (keine Abkürzungen)
- TypeScript konsequent nutzen (kein `any`)

### Code Reviews

Prüfen Sie:
- [ ] Keine Lint-Fehler
- [ ] Dateigröße < 300 Zeilen
- [ ] Funktionen < 50 Zeilen
- [ ] Klare Trennung der Verantwortlichkeiten
- [ ] Keine Code-Duplikation
- [ ] API-Calls nur in Services
- [ ] Aussagekräftige Namen
- [ ] TypeScript-Typen definiert

### Naming Conventions

```typescript
// Komponenten: PascalCase
UserProfile.tsx
ServerList.tsx

// Funktionen/Variablen: camelCase
fetchUserData()
const serverStatus = ...

// Konstanten: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 1024;
const API_BASE_URL = "...";

// CSS/Ordner: kebab-case
user-profile/
server-list.css
```
