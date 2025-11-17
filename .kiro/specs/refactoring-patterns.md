# Refactoring Patterns - Quick Reference

## Pattern 1: Große Datei aufteilen

### Vorher (588 Zeilen)
```typescript
// serverService.ts
export async function listServers() { /* 68 Zeilen */ }
export async function createServer() { /* 142 Zeilen */ }
export async function startServer() { /* 261 Zeilen */ }
export async function stopServer() { /* 50 Zeilen */ }
```

### Nachher (4 Dateien à ~150 Zeilen)
```typescript
// services/server/index.ts
export { listServers } from './serverList';
export { createServer } from './serverCreate';
export { startServer, stopServer } from './serverLifecycle';

// services/server/serverList.ts
export async function listServers() { /* 68 Zeilen */ }

// services/server/serverCreate.ts
export async function createServer() { /* 142 Zeilen */ }

// services/server/serverLifecycle.ts
export async function startServer() { /* 130 Zeilen */ }
export async function stopServer() { /* 50 Zeilen */ }
```

---

## Pattern 2: Lange Funktion aufteilen

### Vorher (142 Zeilen, Komplexität 21)
```typescript
export async function createServer(data: CreateServerData) {
  // Validierung (20 Zeilen)
  if (!data.serverFile) throw new Error("...");
  if (!serverFile.exists()) throw new Error("...");
  
  // Verzeichnis erstellen (30 Zeilen)
  const serverPath = path.join(...);
  await fs.mkdir(serverPath);
  
  // Dateien extrahieren (40 Zeilen)
  const zip = new AdmZip(serverFile);
  zip.extractAllTo(serverPath);
  
  // Metadata erstellen (30 Zeilen)
  const metadata = { ... };
  await fs.writeFile(...);
  
  // Cleanup (20 Zeilen)
  await fs.unlink(serverFile);
  
  return { success: true };
}
```

### Nachher (5 Funktionen à ~30 Zeilen, Komplexität <10)
```typescript
export async function createServer(data: CreateServerData) {
  await validateServerCreation(data);
  const serverPath = await setupServerDirectory(data);
  await extractServerFiles(data.serverFile, serverPath);
  await createServerMetadata(serverPath, data);
  await cleanupTempFiles(data.serverFile);
  return { success: true, serverPath };
}

async function validateServerCreation(data: CreateServerData) {
  if (!data.serverFile) {
    throw new Error("Server file is required");
  }
  
  const exists = await Bun.file(data.serverFile).exists();
  if (!exists) {
    throw new Error("Server file not found");
  }
}

async function setupServerDirectory(data: CreateServerData): Promise<string> {
  const serverName = data.customName || path.basename(data.serverFile, '.zip');
  const serverPath = path.join(process.cwd(), 'server', serverName);
  await fs.mkdir(serverPath, { recursive: true });
  return serverPath;
}

async function extractServerFiles(zipPath: string, targetPath: string) {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetPath, true);
}

async function createServerMetadata(serverPath: string, data: CreateServerData) {
  const metadata = {
    name: data.customName || path.basename(serverPath),
    description: data.description || '',
    createdAt: new Date().toISOString(),
  };
  
  const metadataPath = path.join(serverPath, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

async function cleanupTempFiles(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (_error) {
    // Ignore cleanup errors
  }
}
```

---

## Pattern 3: Komponente aufteilen

### Vorher (522 Zeilen)
```typescript
// WelcomePage.tsx
export function WelcomePage({ onServerCreated }: Props) {
  // 20 State-Variablen
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // ... 18 weitere
  
  // 10 Handler-Funktionen (je 30-50 Zeilen)
  const handleFileUpload = async (file: File) => { /* 50 Zeilen */ };
  const handleDragOver = (e: DragEvent) => { /* 10 Zeilen */ };
  // ... 8 weitere
  
  // Riesiges JSX (300 Zeilen)
  return (
    <div>
      {/* Upload-Bereich */}
      {/* Dateiliste */}
      {/* Auswahl */}
      {/* Button */}
    </div>
  );
}
```

### Nachher (5 Dateien à ~100 Zeilen)
```typescript
// features/welcome/WelcomePage.tsx (268 Zeilen)
export function WelcomePage({ onServerCreated }: Props) {
  const { isUploading, uploadFile } = useServerFileUpload();
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  
  return (
    <Card>
      <ServerFileUpload
        isUploading={isUploading}
        onFileSelect={handleFileSelect}
      />
      {serverFiles.length > 0 && (
        <>
          <ServerFileSelector files={serverFiles} />
          <ServerFileList files={serverFiles} />
        </>
      )}
      <Button onClick={handleCreateServer}>Create</Button>
    </Card>
  );
}

// features/welcome/ServerFileUpload.tsx (74 Zeilen)
export function ServerFileUpload({ isUploading, onFileSelect }: Props) {
  return (
    <div className="upload-zone">
      {/* Upload UI */}
    </div>
  );
}

// features/welcome/useServerFileUpload.ts (98 Zeilen)
export function useServerFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    // Upload-Logik
    setIsUploading(false);
  };
  
  return { isUploading, uploadFile };
}
```

---

## Pattern 4: Verschachtelung reduzieren (Early Returns)

### Vorher (Verschachtelung 5)
```typescript
async function processData(data: Data) {
  if (data) {
    if (data.isValid) {
      if (data.hasPermission) {
        if (data.isActive) {
          if (data.canProcess) {
            // Eigentliche Logik
            return await doSomething(data);
          }
        }
      }
    }
  }
  return null;
}
```

### Nachher (Verschachtelung 1)
```typescript
async function processData(data: Data) {
  // Guard Clauses
  if (!data) return null;
  if (!data.isValid) return null;
  if (!data.hasPermission) return null;
  if (!data.isActive) return null;
  if (!data.canProcess) return null;
  
  // Eigentliche Logik
  return await doSomething(data);
}
```

---

## Pattern 5: console.log durch logger ersetzen

### Vorher
```typescript
console.log("Server starting...");
console.log("Config loaded:", config);
console.error("Failed to start:", error);
```

### Nachher
```typescript
import { logger } from "@/lib/logger";

logger.info("Server starting...");
logger.debug("Config loaded:", config);
logger.error("Failed to start:", error);
```

---

## Pattern 6: Komplexität reduzieren

### Vorher (Komplexität 18)
```typescript
function validateInput(input: Input) {
  if (input.type === 'A') {
    if (input.value > 10) {
      if (input.flag) {
        return true;
      } else {
        return false;
      }
    } else if (input.value < 5) {
      return input.flag ? true : false;
    }
  } else if (input.type === 'B') {
    if (input.value === 0) {
      return false;
    } else {
      return input.flag;
    }
  }
  return false;
}
```

### Nachher (Komplexität 6)
```typescript
function validateInput(input: Input) {
  if (input.type === 'A') {
    return validateTypeA(input);
  }
  
  if (input.type === 'B') {
    return validateTypeB(input);
  }
  
  return false;
}

function validateTypeA(input: Input) {
  if (input.value > 10) {
    return input.flag;
  }
  
  if (input.value < 5) {
    return input.flag;
  }
  
  return false;
}

function validateTypeB(input: Input) {
  if (input.value === 0) {
    return false;
  }
  
  return input.flag;
}
```

---

## Pattern 7: TypeScript any vermeiden

### Vorher
```typescript
function processData(data: any) {
  return data.map((item: any) => {
    return {
      id: item.id,
      name: item.name,
    };
  });
}
```

### Nachher
```typescript
interface RawItem {
  id: string;
  name: string;
}

interface ProcessedItem {
  id: string;
  name: string;
}

function processData(data: RawItem[]): ProcessedItem[] {
  return data.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}
```

---

## Pattern 8: Ungenutzte Variablen

### Vorher
```typescript
try {
  await doSomething();
} catch (error) {
  // error wird nicht verwendet
}

function handler(req, res) {
  // req wird nicht verwendet
  return res.json({ ok: true });
}
```

### Nachher
```typescript
try {
  await doSomething();
} catch (_error) {
  // Explizit ignoriert
}

function handler(_req, res) {
  // Explizit ignoriert
  return res.json({ ok: true });
}
```

---

## Pattern 9: React Hook Dependencies

### Vorher
```typescript
useEffect(() => {
  loadData();
}, []); // ⚠️ Missing dependency: 'loadData'
```

### Nachher (Option 1: Dependency hinzufügen)
```typescript
useEffect(() => {
  loadData();
}, [loadData]);
```

### Nachher (Option 2: useCallback)
```typescript
const loadData = useCallback(async () => {
  // Logik
}, [/* dependencies */]);

useEffect(() => {
  loadData();
}, [loadData]);
```

### Nachher (Option 3: Inline)
```typescript
useEffect(() => {
  const loadData = async () => {
    // Logik
  };
  
  loadData();
}, []); // Jetzt OK
```

### Nachher (Option 4: Disable wenn sicher)
```typescript
useEffect(() => {
  loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Nur bei Mount
```

---

## Checkliste für jedes Refactoring

- [ ] Funktion < 50 Zeilen?
- [ ] Komplexität ≤ 10?
- [ ] Verschachtelung ≤ 3?
- [ ] Keine console.log?
- [ ] Keine any Types?
- [ ] Keine ungenutzten Variablen?
- [ ] Early Returns verwendet?
- [ ] Aussagekräftige Namen?
- [ ] Single Responsibility?
- [ ] Tests bestehen?

## Nützliche Befehle

```bash
# Linting prüfen
bun lint

# Auto-fixes
bun lint:fix

# Spezifische Datei
bun lint src/services/serverService.ts

# Diagnostics
# Öffne Datei in IDE und prüfe Problems Panel
```

## Tipps

1. **Klein anfangen** - Eine Funktion nach der anderen
2. **Tests laufen lassen** - Nach jeder Änderung
3. **Commits machen** - Nach jedem erfolgreichen Refactoring
4. **WelcomePage als Vorbild** - Zeigt alle Patterns
5. **Nicht perfekt sein** - Besser ist besser als perfekt
6. **Pair Programming** - Bei komplexen Refactorings
7. **Code Review** - Vor dem Merge

## Häufige Fehler vermeiden

❌ **Zu viel auf einmal** - Kleine Schritte sind besser
❌ **Keine Tests** - Immer testen nach Änderungen
❌ **Funktionalität ändern** - Nur Struktur ändern
❌ **Keine Commits** - Regelmäßig committen
❌ **Komplexität ignorieren** - Metriken beachten
