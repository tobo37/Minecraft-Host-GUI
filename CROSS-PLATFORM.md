# Cross-Platform Support

## Pure TypeScript ZIP Extraction

Die Anwendung nutzt **reines TypeScript** für ZIP-Extraktion - keine Shell-Befehle nötig!

### Wie es funktioniert

Die `createServer` Funktion in `src/services/serverService.ts` nutzt das `adm-zip` npm-Paket:

```typescript
import AdmZip from "adm-zip";

// ZIP-Datei extrahieren
const zip = new AdmZip(serverFilesZip);
zip.extractAllTo(serverPath, true);
```

### Vorteile

- ✅ **Cross-platform**: Funktioniert auf Linux, Windows, macOS ohne externe Tools
- ✅ **Keine Abhängigkeiten**: Kein `unzip`, PowerShell oder andere Shell-Befehle nötig
- ✅ **Reines TypeScript**: Alles läuft in der Bun/Node.js Runtime
- ✅ **Konsistentes Verhalten**: Gleicher Code-Pfad auf allen Plattformen
- ✅ **Bessere Fehlerbehandlung**: JavaScript Exceptions statt Shell Exit Codes

## Anforderungen

### Alle Plattformen
- [Bun](https://bun.sh) (v1.1.34 oder höher)
- Keine zusätzlichen Tools nötig!

### Dependencies
- `adm-zip` - Pure JavaScript ZIP-Extraktions-Library (synchron, robust)
- `@types/adm-zip` - TypeScript Type Definitions

Beide werden automatisch via `bun install` installiert.

## Docker

Das Dockerfile benötigt das `unzip` Paket nicht mehr, da die Extraktion in TypeScript erfolgt:

```dockerfile
# Alt (nicht mehr nötig):
# RUN apt-get install unzip

# Neu: Nur Bun und Dependencies installieren
RUN bun install
```

## Testing

Auf jeder Plattform testen:
1. `bun dev` oder `bun start` ausführen
2. Server-ZIP-Datei hochladen
3. Neuen Server erstellen
4. Die Extraktion nutzt die unzipper Library

## Fehlerbehandlung

Alle Extraktionsfehler werden als JavaScript Exceptions mit detaillierten Fehlermeldungen gefangen:

```typescript
try {
  const zip = new AdmZip(zipFile);
  zip.extractAllTo(dest, true);
} catch (extractError) {
  console.error("ZIP extraction failed:", extractError);
  // Aufräumen und Fehler-Response zurückgeben
}
```
