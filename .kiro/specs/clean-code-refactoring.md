---
status: in-progress
priority: high
created: 2024-01-16
---

# Clean Code Refactoring Spec

## Ziel

Reduzierung der ESLint-Warnungen von 172 auf unter 20 durch systematisches Refactoring nach Clean Code Prinzipien.

## Aktueller Status

- ✅ ESLint konfiguriert
- ✅ Clean Code Steering erstellt
- ✅ WelcomePage refactored (Vorbild)
- ✅ Logger Utility erstellt
- 🟡 173 Probleme (1 Fehler, 172 Warnungen)

## Aufgaben

### Phase 1: Letzter Fehler beheben (5 Min)

#### Task 1.1: Empty catch block fixen
**Datei:** `src/services/javaService.ts:219`

**Problem:**
```typescript
} catch {}  // ❌ Empty block statement
```

**Lösung:**
```typescript
} catch (_error) {
  // Ignore cleanup errors
}
```

**Akzeptanzkriterien:**
- [ ] Keine ESLint-Fehler mehr
- [ ] `bun lint` zeigt 0 Fehler

---

### Phase 2: Große Service-Dateien refactoren (2-3 Stunden)

#### Task 2.1: serverService.ts aufteilen (588 → ~150 Zeilen/Datei)

**Ziel:** Layered Architecture implementieren

**Neue Struktur:**
```
src/services/server/
├── index.ts                 # Public API (re-exports)
├── serverList.ts            # listServers() - ~80 Zeilen
├── serverCreate.ts          # createServer() - ~150 Zeilen
├── serverLifecycle.ts       # startServer(), stopServer() - ~280 Zeilen
├── serverRepository.ts      # Dateisystem-Zugriff - ~80 Zeilen
└── server.types.ts          # Shared types
```

**Schritte:**
1. [ ] `server.types.ts` erstellen - Alle Interfaces extrahieren
2. [ ] `serverRepository.ts` erstellen - Dateisystem-Operationen
   - `readServerDirectory()`
   - `writeServerFile()`
   - `deleteServerDirectory()`
3. [ ] `serverList.ts` erstellen - `listServers()` verschieben
   - Komplexität von 12 auf <10 reduzieren
   - Verschachtelung von 5 auf 3 reduzieren
4. [ ] `serverCreate.ts` erstellen - `createServer()` verschieben
   - Komplexität von 21 auf <10 reduzieren
   - In kleinere Funktionen aufteilen:
     - `validateServerCreation()`
     - `extractServerFiles()`
     - `setupServerDirectory()`
     - `createServerMetadata()`
5. [ ] `serverLifecycle.ts` erstellen - `startServer()`, `stopServer()` verschieben
   - `startServer()` von 261 auf <50 Zeilen reduzieren
   - Aufteilen in:
     - `validateServerStart()`
     - `loadServerConfiguration()`
     - `ensureJavaAvailable()`
     - `launchServerProcess()`
     - `setupProcessHandlers()`
6. [ ] `index.ts` erstellen - Public API
7. [ ] Alte `serverService.ts` durch Imports ersetzen
8. [ ] Tests durchführen

**Akzeptanzkriterien:**
- [ ] Keine Datei >300 Zeilen
- [ ] Keine Funktion >50 Zeilen
- [ ] Komplexität aller Funktionen ≤10
- [ ] Verschachtelung ≤3
- [ ] Alle Tests bestehen
- [ ] Server kann gestartet/gestoppt werden

---

#### Task 2.2: serverFileService.ts aufteilen (401 → ~100 Zeilen/Datei)

**Neue Struktur:**
```
src/services/serverFile/
├── index.ts                    # Public API
├── serverFileList.ts           # listServerFiles(), deleteServerFile()
├── serverFileUpload.ts         # uploadServerFile() - Standard
├── serverFileUploadChunked.ts  # uploadServerFileChunked()
├── serverFileUploadStream.ts   # uploadServerFileStream()
└── serverFile.types.ts         # Shared types
```

**Schritte:**
1. [ ] `serverFile.types.ts` erstellen
2. [ ] `serverFileList.ts` erstellen
   - `listServerFiles()`
   - `deleteServerFile()`
3. [ ] `serverFileUpload.ts` erstellen
   - `uploadServerFile()` von 83 auf <50 Zeilen
   - Komplexität von 11 auf <10
4. [ ] `serverFileUploadChunked.ts` erstellen
   - `uploadServerFileChunked()` von 104 auf <50 Zeilen
   - Komplexität von 18 auf <10
   - Verschachtelung von 5 auf 3 reduzieren
5. [ ] `serverFileUploadStream.ts` erstellen
   - `uploadServerFileStream()` von 99 auf <50 Zeilen
   - Komplexität von 20 auf <10
6. [ ] `index.ts` erstellen
7. [ ] Alte Datei ersetzen
8. [ ] Upload-Tests durchführen

**Akzeptanzkriterien:**
- [ ] Keine Datei >300 Zeilen
- [ ] Keine Funktion >50 Zeilen
- [ ] Komplexität ≤10
- [ ] Verschachtelung ≤3
- [ ] File-Upload funktioniert (alle 3 Methoden)

---

#### Task 2.3: startFileService.ts refactoren

**Probleme:**
- `findStartFiles()`: 103 Zeilen
- `searchDirectory()`: 53 Zeilen, Komplexität 18
- `setStartFile()`: 57 Zeilen

**Schritte:**
1. [ ] `findStartFiles()` aufteilen:
   - `validateServerPath()`
   - `scanServerDirectory()`
   - `filterStartFiles()`
2. [ ] `searchDirectory()` aufteilen:
   - Komplexität von 18 auf <10
   - Verschachtelung von 4 auf 3
   - Early Returns verwenden
3. [ ] `setStartFile()` aufteilen:
   - `validateStartFile()`
   - `updateMetadata()`

**Akzeptanzkriterien:**
- [ ] Alle Funktionen <50 Zeilen
- [ ] Komplexität ≤10
- [ ] Verschachtelung ≤3

---

#### Task 2.4: configService.ts refactoren

**Probleme:**
- `listConfigFiles()`: 93 Zeilen

**Schritte:**
1. [ ] Funktion aufteilen:
   - `validateConfigPath()`
   - `scanConfigDirectory()`
   - `parseConfigFiles()`
   - `formatConfigList()`

**Akzeptanzkriterien:**
- [ ] Alle Funktionen <50 Zeilen

---

#### Task 2.5: metadataApiService.ts refactoren

**Probleme:**
- `updateServerMetadata()`: 96 Zeilen, Komplexität 16
- `deleteServerInstance()`: 63 Zeilen

**Schritte:**
1. [ ] `updateServerMetadata()` aufteilen:
   - `validateMetadata()`
   - `loadExistingMetadata()`
   - `mergeMetadata()`
   - `saveMetadata()`
2. [ ] `deleteServerInstance()` aufteilen:
   - `validateDeletion()`
   - `stopServerIfRunning()`
   - `removeServerFiles()`

**Akzeptanzkriterien:**
- [ ] Alle Funktionen <50 Zeilen
- [ ] Komplexität ≤10

---

### Phase 3: Große Komponenten refactoren (1-2 Stunden)

#### Task 3.1: JavaManagement.tsx aufteilen (319 → ~150 Zeilen/Datei)

**Neue Struktur:**
```
src/features/java/
├── JavaManagement.tsx       # Hauptkomponente (~100 Zeilen)
├── JavaInfo.tsx            # Java-Info Anzeige
├── JabbaInstall.tsx        # Jabba Installation
├── JavaVersionSelector.tsx # Version-Auswahl
├── useJavaInfo.ts          # Java-Info Hook
└── useJabbaInstall.ts      # Installation Hook
```

**Schritte:**
1. [ ] Feature-Ordner erstellen
2. [ ] Hooks extrahieren:
   - `useJavaInfo.ts` - fetchJavaInfo()
   - `useJabbaInstall.ts` - Installation-Logik
3. [ ] Komponenten aufteilen:
   - `JavaInfo.tsx` - Info-Anzeige
   - `JabbaInstall.tsx` - Installation UI
   - `JavaVersionSelector.tsx` - Version-Auswahl
4. [ ] Hauptkomponente vereinfachen
5. [ ] Alte Datei durch Re-Export ersetzen

**Akzeptanzkriterien:**
- [ ] Keine Datei >300 Zeilen
- [ ] Keine Funktion >50 Zeilen
- [ ] Komplexität ≤10
- [ ] Java-Management funktioniert

---

#### Task 3.2: ConfigurationManagement.tsx refactoren (248 Zeilen)

**Neue Struktur:**
```
src/features/config/
├── ConfigurationManagement.tsx  # Hauptkomponente (~80 Zeilen)
├── ConfigFileList.tsx          # Dateiliste
├── ConfigEditor.tsx            # Editor
└── useConfigFiles.ts           # Config-Logik Hook
```

**Schritte:**
1. [ ] Hook extrahieren: `useConfigFiles.ts`
2. [ ] Komponenten aufteilen:
   - `ConfigFileList.tsx`
   - `ConfigEditor.tsx`
3. [ ] Hauptkomponente vereinfachen
4. [ ] Komplexität von 13 auf <10

**Akzeptanzkriterien:**
- [ ] Alle Funktionen <50 Zeilen
- [ ] Komplexität ≤10
- [ ] Config-Editor funktioniert

---

#### Task 3.3: Weitere große Komponenten

**ProjectSelection.tsx (146 Zeilen):**
1. [ ] `ServerCard.tsx` extrahieren
2. [ ] `useServerList.ts` Hook erstellen

**ServerManagement.tsx (57 Zeilen):**
- ✅ Bereits unter Limit, aber könnte verbessert werden

**ServerOverview.tsx (149 Zeilen):**
1. [ ] Bereits gut strukturiert mit Sub-Komponenten
2. [ ] Ungenutzte Props entfernen

---

### Phase 4: Kleine Komponenten optimieren (30 Min)

#### Task 4.1: Server-Komponenten

**DeleteDialog.tsx (68 Zeilen):**
1. [ ] Validierungs-Logik in Hook extrahieren

**RenameDialog.tsx (53 Zeilen):**
1. [ ] Validierungs-Logik in Hook extrahieren

**ServerControls.tsx (59 Zeilen):**
1. [ ] Button-Gruppe extrahieren

**ServerInfoCard.tsx (155 Zeilen, Komplexität 14):**
1. [ ] In kleinere Komponenten aufteilen:
   - `ServerInfoHeader.tsx`
   - `ServerInfoDetails.tsx`
   - `ServerInfoActions.tsx`

**ServerLogs.tsx (72 Zeilen, Komplexität 18):**
1. [ ] Log-Parsing in Utility-Funktion
2. [ ] Komplexität von 18 auf <10

**StartFileDialog.tsx (130 Zeilen):**
1. [ ] `StartFileList.tsx` extrahieren
2. [ ] `useStartFileSearch.ts` Hook

---

### Phase 5: Hooks optimieren (30 Min)

#### Task 5.1: Zu lange Hooks

**useServerStatus.ts (123 Zeilen):**
1. [ ] In mehrere Hooks aufteilen:
   - `useServerPolling.ts`
   - `useServerLogs.ts`

**useServerFileUpload.ts (98 Zeilen):**
1. [ ] Bereits gut, aber könnte aufgeteilt werden:
   - `useRegularUpload.ts`
   - `useStreamUpload.ts`

**useStartFile.ts (77 Zeilen):**
1. [ ] Validierung extrahieren
2. [ ] API-Calls in Service verschieben

**useServerMetadata.ts (58 Zeilen):**
1. [ ] Bereits gut, kleine Optimierungen

**useServerDelete.ts (52 Zeilen):**
1. [ ] Bereits gut, kleine Optimierungen

---

### Phase 6: console.log durch logger ersetzen (30 Min)

#### Task 6.1: Logger in allen Services verwenden

**Dateien:**
- `src/services/serverService.ts` (~15 console.log)
- `src/services/serverFileService.ts` (~15 console.log)
- `src/services/javaService.ts` (~5 console.log)
- `src/services/metadataService.ts` (~2 console.log)
- `src/services/metadataApiService.ts` (~2 console.log)
- `src/index.ts` (~2 console.log)

**Schritte:**
1. [ ] Import hinzufügen: `import { logger } from "@/lib/logger";`
2. [ ] Ersetzen:
   - `console.log()` → `logger.info()`
   - `console.error()` → `logger.error()`
   - `console.warn()` → `logger.warn()`

**Akzeptanzkriterien:**
- [ ] Keine console.log Warnungen mehr
- [ ] Logging funktioniert weiterhin

---

### Phase 7: React Hook Dependencies (15 Min)

#### Task 7.1: useEffect Dependencies hinzufügen

**Dateien mit Warnungen:**
- `ConfigurationManagement.tsx` - loadConfigFiles
- `JavaManagement.tsx` - fetchJavaInfo
- `useServerInfo.ts` - fetchServerInfo
- `useServerStatus.ts` - checkServerStatus, startLogPolling
- `WelcomePage.tsx` - loadServerFiles

**Schritte:**
1. [ ] Dependencies hinzufügen oder
2. [ ] `// eslint-disable-next-line react-hooks/exhaustive-deps` verwenden

**Akzeptanzkriterien:**
- [ ] Keine exhaustive-deps Warnungen

---

### Phase 8: TypeScript any entfernen (30 Min)

#### Task 8.1: Spezifische Typen definieren

**Dateien:**
- `src/services/types.ts:43` - any in Interface
- `src/services/serverService.ts:12` - any Parameter
- `src/services/serverFileService.ts` - mehrere any
- `src/services/metadataApiService.ts:99` - any
- `src/hooks/useStartFile.ts` - 2x any
- `src/components/server/ServerOverview.tsx:54` - any

**Schritte:**
1. [ ] Interfaces für alle Datenstrukturen definieren
2. [ ] any durch spezifische Typen ersetzen
3. [ ] unknown verwenden wo Typ unbekannt

**Akzeptanzkriterien:**
- [ ] Keine @typescript-eslint/no-explicit-any Warnungen

---

### Phase 9: Ungenutzte Variablen bereinigen (15 Min)

#### Task 9.1: Catch-Block Parameter

**Dateien:**
- `src/services/configService.ts` - 2x error
- `src/services/serverFileService.ts` - 3x error, mkdirError
- `src/services/serverService.ts` - serverDir

**Schritte:**
1. [ ] Mit `_` prefix versehen: `catch (_error)`
2. [ ] Oder verwenden wenn sinnvoll

**Akzeptanzkriterien:**
- [ ] Keine no-unused-vars Warnungen für catch-Blöcke

---

### Phase 10: Verschachtelung reduzieren (1 Stunde)

#### Task 10.1: Early Returns verwenden

**Dateien mit Verschachtelung >3:**
- `serverService.ts` - mehrere Stellen
- `serverFileService.ts` - mehrere Stellen
- `javaService.ts` - mehrere Stellen
- `startFileService.ts` - searchDirectory

**Pattern:**
```typescript
// ❌ Vorher: Verschachtelung 4
if (condition1) {
  if (condition2) {
    if (condition3) {
      if (condition4) {
        // Code
      }
    }
  }
}

// ✅ Nachher: Verschachtelung 1
if (!condition1) return;
if (!condition2) return;
if (!condition3) return;
if (!condition4) return;
// Code
```

**Akzeptanzkriterien:**
- [ ] Keine max-depth Warnungen

---

## Erfolgskriterien

### Gesamt-Ziele:
- [ ] **0 Fehler** (aktuell: 1)
- [ ] **<20 Warnungen** (aktuell: 172)
- [ ] **Keine Datei >300 Zeilen** (aktuell: 3)
- [ ] **Keine Funktion >50 Zeilen** (aktuell: ~40)
- [ ] **Alle Komplexitäten ≤10** (aktuell: mehrere >10)
- [ ] **Alle Verschachtelungen ≤3** (aktuell: mehrere >3)

### Qualitäts-Metriken:
- [ ] Alle Tests bestehen
- [ ] Anwendung funktioniert vollständig
- [ ] Keine Regression in Features
- [ ] Code-Review bestanden

## Zeitschätzung

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Letzter Fehler | 5 Min | 🔴 Hoch |
| Phase 2: Services | 2-3 Std | 🔴 Hoch |
| Phase 3: Komponenten | 1-2 Std | 🟡 Mittel |
| Phase 4: Kleine Komponenten | 30 Min | 🟡 Mittel |
| Phase 5: Hooks | 30 Min | 🟡 Mittel |
| Phase 6: Logger | 30 Min | 🟢 Niedrig |
| Phase 7: Dependencies | 15 Min | 🟢 Niedrig |
| Phase 8: TypeScript | 30 Min | 🟡 Mittel |
| Phase 9: Variablen | 15 Min | 🟢 Niedrig |
| Phase 10: Verschachtelung | 1 Std | 🟡 Mittel |

**Gesamt:** 6-8 Stunden

## Reihenfolge

1. **Phase 1** - Schneller Win
2. **Phase 2** - Größter Impact
3. **Phase 6** - Einfach, viele Warnungen
4. **Phase 3** - Komponenten
5. **Phase 7, 9** - Schnelle Fixes
6. **Phase 8, 10** - Qualität
7. **Phase 4, 5** - Feinschliff

## Referenzen

- WelcomePage Refactoring als Vorbild: `src/features/welcome/`
- Clean Code Prinzipien: `.kiro/steering/clean-code.md`
- Architektur-Guide: `docs/CODE-QUALITY.md`
- Fortschritt: `LINTING-FINAL-STATUS.md`

## Notizen

- Nach jeder Phase `bun lint` ausführen
- Nach jedem Task testen
- Commits nach jedem abgeschlossenen Task
- Bei Problemen: WelcomePage als Referenz nutzen
