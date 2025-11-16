# Custom Hooks

Diese Custom Hooks kapseln die gesamte Business-Logik für das Server-Management.

## Übersicht

| Hook | Zweck | Hauptfunktionen |
|------|-------|-----------------|
| `useServerInfo` | Server-Metadaten laden | `serverInfo`, `refetch()` |
| `useServerStatus` | Status & Logs verwalten | `serverStatus`, `logs`, `startServer()`, `stopServer()` |
| `useServerMetadata` | Server umbenennen | `handleRename()`, Dialog-State |
| `useServerDescription` | Beschreibung bearbeiten | `handleUpdateDescription()`, Edit-State |
| `useServerDelete` | Server löschen | `handleDeleteServer()`, Dialog-State |
| `useStartFile` | Startdatei verwalten | `handleFindStartFiles()`, `handleSetStartFile()` |

## Detaillierte Dokumentation

### useServerInfo

Lädt und verwaltet Server-Metadaten.

```typescript
const { serverInfo, isLoading, refetch } = useServerInfo(projectPath);
```

**Parameter:**
- `projectPath: string` - Pfad zum Server-Verzeichnis

**Rückgabewerte:**
- `serverInfo: Server | null` - Server-Metadaten
- `isLoading: boolean` - Lade-Status
- `refetch: () => Promise<void>` - Daten neu laden

**Verwendung:**
```typescript
// Automatisches Laden beim Mount
const { serverInfo, refetch } = useServerInfo("/server/my-server");

// Manuelles Neuladen nach Änderungen
await refetch();
```

---

### useServerStatus

Überwacht Server-Status und verwaltet Logs mit automatischem Polling.

```typescript
const { 
  serverStatus, 
  logs, 
  isPollingLogs, 
  startServer, 
  stopServer 
} = useServerStatus(projectPath);
```

**Parameter:**
- `projectPath: string` - Pfad zum Server-Verzeichnis

**Rückgabewerte:**
- `serverStatus: ServerStatus` - Aktueller Status (stopped, starting, running, stopping)
- `logs: string[]` - Server-Logs
- `isPollingLogs: boolean` - Ob Logs aktiv gepollt werden
- `startServer: () => Promise<void>` - Server starten
- `stopServer: () => Promise<void>` - Server stoppen

**Features:**
- Automatisches Log-Polling wenn Server läuft (1s Intervall)
- Status-Überwachung
- Cleanup beim Unmount

---

### useServerMetadata

Verwaltet das Umbenennen von Servern mit Validierung.

```typescript
const {
  isRenameDialogOpen,
  newName,
  validationError,
  setNewName,
  handleRename,
  openRenameDialog,
  closeRenameDialog
} = useServerMetadata({ projectPath, onSuccess });
```

**Parameter:**
- `projectPath: string` - Pfad zum Server-Verzeichnis
- `onSuccess?: () => void` - Callback nach erfolgreichem Umbenennen

**Validierung:**
- Nur alphanumerische Zeichen, Leerzeichen, Bindestriche und Unterstriche
- Regex: `/^[a-zA-Z0-9\s\-_]+$/`

---

### useServerDescription

Verwaltet das Bearbeiten der Server-Beschreibung.

```typescript
const {
  isEditingDescription,
  newDescription,
  setNewDescription,
  handleUpdateDescription,
  startEditing,
  cancelEditing
} = useServerDescription({ projectPath, onSuccess });
```

**Parameter:**
- `projectPath: string` - Pfad zum Server-Verzeichnis
- `onSuccess?: () => void` - Callback nach erfolgreichem Update

**Workflow:**
1. `startEditing(currentDescription)` - Edit-Mode aktivieren
2. `setNewDescription(text)` - Text ändern
3. `handleUpdateDescription()` - Speichern
4. `cancelEditing(currentDescription)` - Abbrechen

---

### useServerDelete

Verwaltet das Löschen von Servern mit Bestätigung.

```typescript
const {
  isDeleteDialogOpen,
  deleteConfirmName,
  deleteValidationError,
  setDeleteConfirmName,
  handleDeleteServer,
  openDeleteDialog,
  closeDeleteDialog
} = useServerDelete({ projectPath, onSuccess });
```

**Parameter:**
- `projectPath: string` - Pfad zum Server-Verzeichnis
- `onSuccess?: () => void` - Callback nach erfolgreichem Löschen

**Sicherheit:**
- Benutzer muss Server-Namen exakt eingeben
- Validierung vor Löschvorgang

---

### useStartFile

Sucht und setzt die Startdatei für den Server.

```typescript
const {
  isStartFileDialogOpen,
  startFileCandidates,
  selectedStartFile,
  isSearchingStartFiles,
  setSelectedStartFile,
  handleFindStartFiles,
  handleSetStartFile,
  closeStartFileDialog
} = useStartFile({ projectPath, currentStartFile, onSuccess });
```

**Parameter:**
- `projectPath: string` - Pfad zum Server-Verzeichnis
- `currentStartFile?: string` - Aktuell gesetzte Startdatei
- `onSuccess?: () => void` - Callback nach erfolgreichem Setzen

**Features:**
- Automatische Suche nach Startdateien
- Confidence-Level für Kandidaten (high, medium, low)
- Vorauswahl der besten Kandidaten

**Workflow:**
1. `handleFindStartFiles()` - Suche starten
2. Kandidaten werden in `startFileCandidates` geladen
3. `setSelectedStartFile(path)` - Datei auswählen
4. `handleSetStartFile()` - Auswahl speichern

## Best Practices

### Hook-Komposition

Hooks können kombiniert werden für komplexe Workflows:

```typescript
const { serverInfo, refetch } = useServerInfo(projectPath);
const metadata = useServerMetadata({ 
  projectPath, 
  onSuccess: refetch // Daten nach Änderung neu laden
});
```

### Error Handling

Alle Hooks loggen Fehler in die Console. Für produktive Anwendungen sollte ein zentrales Error-Handling implementiert werden:

```typescript
// In jedem Hook
try {
  // API Call
} catch (error) {
  console.error("Error:", error);
  // TODO: Zentrales Error-Handling
}
```

### Cleanup

Hooks mit Timern (wie `useServerStatus`) führen automatisch Cleanup durch:

```typescript
useEffect(() => {
  // Setup
  return () => {
    // Cleanup
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, []);
```

## Testing

Hooks können isoliert getestet werden mit `@testing-library/react-hooks`:

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useServerInfo } from './useServerInfo';

test('loads server info on mount', async () => {
  const { result, waitForNextUpdate } = renderHook(() => 
    useServerInfo('/test/path')
  );
  
  await waitForNextUpdate();
  
  expect(result.current.serverInfo).toBeDefined();
  expect(result.current.isLoading).toBe(false);
});
```
