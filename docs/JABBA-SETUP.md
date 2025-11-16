# Jabba Java Version Manager Setup

## Problem

Nach der Installation von Jabba und der Auswahl einer Java-Version mit `jabba use <version>` wurde der Java-Pfad nicht korrekt gesetzt, da Jabba nur die Umgebungsvariablen der aktuellen Shell-Session ändert.

## Lösung

Die Anwendung lädt jetzt automatisch die Jabba-Umgebung beim Server-Start:

1. **Beim Server-Start**: Die Funktion `loadJabbaEnvironment()` wird automatisch aufgerufen und lädt die aktuell ausgewählte Jabba-Version
2. **Bei Version-Wechsel**: Wenn du über die UI eine Java-Version mit `jabba use` auswählst, werden die Umgebungsvariablen (`JAVA_HOME` und `PATH`) sofort im laufenden Prozess aktualisiert

## Wie es funktioniert

### Automatisches Laden beim Start

```typescript
// In src/index.ts
await loadJabbaEnvironment();
```

Diese Funktion:
- Prüft, ob Jabba installiert ist
- Ermittelt die aktuell ausgewählte Version
- Setzt `JAVA_HOME` und `PATH` entsprechend

### Manueller Version-Wechsel

Wenn du über die UI eine Version auswählst:

```typescript
// In src/services/javaService.ts
export async function useJabbaVersion(version: string) {
  // Führt 'jabba use <version>' aus
  const result = await execJabba(['use', version]);
  
  // Aktualisiert die Prozess-Umgebungsvariablen
  const jabbaEnv = await getJabbaEnv(version);
  process.env.JAVA_HOME = jabbaEnv.JAVA_HOME;
  process.env.PATH = jabbaEnv.PATH;
}
```

## Jabba-Verzeichnisstruktur

Jabba installiert Java-Versionen in:
- **Windows**: `%USERPROFILE%\.jabba\jdk\<version>`
- **Linux/macOS**: `~/.jabba/jdk/<version>`

Die Java-Binaries befinden sich dann in:
- **Windows**: `%USERPROFILE%\.jabba\jdk\<version>\bin`
- **Linux/macOS**: `~/.jabba/jdk/<version>/bin`

## Verwendung

1. **Jabba installieren** (falls noch nicht geschehen):
   ```bash
   # Windows (PowerShell)
   Invoke-Expression (Invoke-WebRequest https://github.com/shyiko/jabba/raw/master/install.ps1 -UseBasicParsing).Content
   
   # Linux/macOS
   curl -sL https://github.com/shyiko/jabba/raw/master/install.sh | bash
   ```

2. **Java-Version installieren**:
   ```bash
   jabba install openjdk@1.21.0
   ```

3. **Version auswählen**:
   ```bash
   jabba use openjdk@1.21.0
   ```

4. **Server neu starten**:
   ```bash
   bun run start
   ```

Die ausgewählte Java-Version wird automatisch geladen!

## Hinweise

- Nach einem Neustart des Servers wird die zuletzt mit `jabba use` ausgewählte Version automatisch geladen
- Du kannst die Version auch über die Web-UI wechseln (falls implementiert)
- Die Umgebungsvariablen gelten nur für den laufenden Server-Prozess und dessen Child-Prozesse (z.B. Minecraft-Server)
