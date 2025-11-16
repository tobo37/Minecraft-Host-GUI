---
inclusion: always
---

# Clean Code & Architecture Principles

## Code Quality Standards

### File Size Limits
- **Maximum 300 lines per file** (excluding blank lines and comments)
- If a file exceeds this limit, split it into smaller, focused modules
- Use composition and separation of concerns

### Function Complexity
- **Maximum 50 lines per function**
- **Maximum 4 parameters per function** - use objects for more parameters
- **Cyclomatic complexity ≤ 10** - break down complex logic
- **Maximum nesting depth of 3** - extract nested logic into separate functions

### Naming Conventions
- Use descriptive, self-documenting names
- Avoid abbreviations unless universally understood
- Boolean variables: `isLoading`, `hasError`, `canSubmit`
- Functions: verb-based names (`fetchData`, `handleClick`, `validateInput`)
- Components: PascalCase, noun-based (`UserProfile`, `ServerList`)

## Architecture Principles

### 🧱 Separation of Concerns (Trennung der Verantwortlichkeiten)

Die wichtigste Regel ist die **Trennung der Verantwortlichkeiten**. Dies bekämpft große Dateien und unübersichtliche Strukturen.

### 🌐 Frontend (React) - Layered Architecture

#### Komponentenstruktur
Nutzen Sie eine klare Hierarchie:

**pages / views**
- Oberste Komponenten, die Routen zugeordnet sind
- Fügen andere Komponenten zusammen
- Beispiel: `WelcomePage.tsx`, `ServerManagement.tsx`

**features / modules**
- Logisch zusammenhängende, komplexe Teile der Anwendung
- Enthalten eigene Zustandslogik und Unterkomponenten
- Beispiel: `server/`, `java/`, `config/`
- Struktur:
  ```
  features/server/
  ├── ServerOverview.tsx
  ├── ServerControls.tsx
  ├── ServerLogs.tsx
  └── useServerStatus.ts
  ```

**components / ui**
- Wiederverwendbare, "dumme" Komponenten
- Nur Styling und UI-Elemente (Buttons, Inputs)
- Keine Anwendungslogik
- Beispiel: `ui/button.tsx`, `ui/dialog.tsx`

#### State Management
- Trennen Sie globalen Zustand klar ab
- Komponenten konsumieren und stellen Zustand nur dar
- Verwenden Sie Custom Hooks für komplexe Zustandslogik

#### API-Calls
- Zentralisieren Sie Backend-Kommunikation in `services/`
- Komponenten rufen nur Services auf
- **Niemals direkt `fetch` in Komponenten verwenden**
- Beispiel:
  ```typescript
  // ❌ Schlecht: fetch direkt in Komponente
  function UserList() {
    const [users, setUsers] = useState([]);
    useEffect(() => {
      fetch('/api/users').then(r => r.json()).then(setUsers);
    }, []);
  }
  
  // ✅ Gut: Service-Schicht verwenden
  function UserList() {
    const { users, loading } = useUsers(); // Custom Hook
  }
  ```

### 🚀 Backend (Bun) - Layered Architecture

Nutzen Sie das **Schichtenmodell**, um Logik zu isolieren:

#### routes / controllers
- Nehmen eingehende Anfragen entgegen
- Validieren Request-Daten
- Rufen Service-Schicht auf
- Kümmern sich um HTTP-spezifische Dinge (Statuscodes, Response-Objekte)
- **Sollten dünn sein** (< 30 Zeilen pro Route Handler)

```typescript
// ✅ Gut: Dünner Controller
app.get("/api/servers", async (req) => {
  const servers = await serverService.listServers();
  return Response.json(servers);
});

// ❌ Schlecht: Geschäftslogik im Controller
app.get("/api/servers", async (req) => {
  const serverDir = path.join(process.cwd(), "server");
  const entries = await fs.readdir(serverDir);
  // ... 50+ Zeilen Logik ...
});
```

#### services / business logic
- Enthalten die eigentliche Geschäftslogik
- Koordinieren Aktionen
- Rufen Datenbank-/Repository-Schicht auf
- Wissen **nichts** über HTTP (Request/Response)

```typescript
// services/serverService.ts
export async function listServers(): Promise<Server[]> {
  const servers = await serverRepository.findAll();
  return servers.map(enrichWithMetadata);
}
```

#### data / repositories / models
- Isolieren Datenbankzugriffslogik
- Wissen, wie man Daten speichert, abruft oder aktualisiert
- Service-Schicht sollte **nichts** über SQL/Dateisystem wissen

```typescript
// repositories/serverRepository.ts
export async function findAll(): Promise<ServerData[]> {
  const serverDir = path.join(process.cwd(), "server");
  return await fs.readdir(serverDir);
}
```

#### middleware
- Trennen Sie Logik wie Authentifizierung, Validierung, Logging
- Separate Middleware-Funktionen
- Wiederverwendbar über mehrere Routes

### 🧹 Clean Code Principles

#### Single Responsibility Principle (SRP)
- **Frontend**: Eine Komponente hat nur eine Aufgabe
  - Button ist für Klicken, nicht für Daten laden
  - Trennen Sie Darstellung von Logik
- **Backend**: Eine Funktion/Klasse hat nur einen Grund zur Änderung
  - Controller nur für HTTP-Handling
  - Service nur für Business-Logik

#### DRY (Don't Repeat Yourself)
- Vermeiden Sie doppelte Codeblöcke
- Verschieben Sie wiederholende Logik in:
  - `utils/` für allgemeine Hilfsfunktionen
  - Custom Hooks für React-Logik
  - Shared Services für Backend-Logik

#### Aussagekräftige Namen
Variablen, Funktionen und Komponenten sollten ihre Absicht klar widerspiegeln:

```typescript
// ❌ Schlecht
function handleData() { }
function doStuff() { }
const x = getData();

// ✅ Gut
function fetchUserCredentials() { }
function validateEmailInput() { }
const userProfile = getUserProfile();
```

#### Kleine Funktionen
- Funktionen sollten **< 20-30 Zeilen** haben
- Wenn länger: Signal, dass sie zu viele Aufgaben erledigt
- Teilen Sie auf in kleinere, fokussierte Funktionen

```typescript
// ❌ Schlecht: 100+ Zeilen Funktion
function processServerData() {
  // Validierung
  // Transformation
  // Speicherung
  // Logging
  // Error Handling
}

// ✅ Gut: Aufgeteilt
function processServerData(data: ServerData) {
  const validated = validateServerData(data);
  const transformed = transformServerData(validated);
  const saved = saveServerData(transformed);
  logServerOperation(saved);
  return saved;
}
```

### 📂 Monorepo-Struktur (Empfohlen für Bun + React)

Da Sie Bun verwenden, ist ein Monorepo-Ansatz sinnvoll:

```
packages/
├── backend/          # Bun Server
│   ├── routes/
│   ├── services/
│   ├── repositories/
│   └── middleware/
├── frontend/         # React App
│   ├── pages/
│   ├── features/
│   ├── components/
│   └── hooks/
└── shared/           # Gemeinsam genutzt
    ├── types/        # TypeScript-Typen
    ├── validation/   # Validierungsschemata
    └── constants/    # Konstanten
```

**Vorteile:**
- Typen zwischen Backend und Frontend teilen
- Keine Code-Duplikation
- Konsistente Validierung
- Einfachere Refactorings

## Code Organization

### 🗂️ Konsistente Benennung und Konventionen

#### Naming Conventions
- **PascalCase** für React-Komponenten: `UserProfile.tsx`, `ServerList.tsx`
- **camelCase** für Funktionen, Variablen, Dateien (keine Komponenten): `userService.ts`, `fetchData.ts`
- **UPPER_SNAKE_CASE** für Konstanten: `MAX_FILE_SIZE`, `API_BASE_URL`
- **kebab-case** für CSS-Klassen und Ordner: `user-profile`, `server-list`

#### TypeScript
- Nutzen Sie TypeScript **konsequent**
- Definieren Sie Interfaces für alle Datenstrukturen
- Vermeiden Sie `any` - verwenden Sie `unknown` oder spezifische Typen
- Fehler werden frühzeitig erkannt

### Import Order
1. External dependencies (React, libraries)
2. Internal absolute imports (`@/components`, `@/lib`)
3. Relative imports (`./`, `../`)
4. Type imports (if separate)

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { ServerConfig } from "./types";
```

### File Structure

#### Feature-basierte Struktur (Empfohlen)
```
features/server/
├── ServerOverview.tsx       # Hauptkomponente
├── ServerControls.tsx       # Unterkomponente
├── ServerLogs.tsx          # Unterkomponente
├── server.types.ts         # Type definitions
├── server.utils.ts         # Helper functions
├── useServerStatus.ts      # Custom Hook
└── index.ts               # Public exports
```

#### Einzelne Komponente
```
ComponentName/
├── ComponentName.tsx       # Main component
├── ComponentName.types.ts  # Type definitions
├── ComponentName.utils.ts  # Helper functions
└── index.ts               # Public exports
```

## Best Practices

### TypeScript
- Avoid `any` - use proper types or `unknown`
- Define interfaces for all props and data structures
- Use type inference where obvious
- Enable strict mode flags

### Error Handling
- Always handle errors explicitly
- Provide meaningful error messages
- Use try-catch for async operations
- Log errors with context

### Performance
- Memoize expensive computations (`useMemo`)
- Memoize callbacks passed to children (`useCallback`)
- Lazy load heavy components
- Avoid unnecessary re-renders

### Testing Mindset
- Write code that's easy to test
- Keep functions pure when possible
- Avoid tight coupling
- Use dependency injection

## Refactoring Triggers

Refactor when you see:
- Functions longer than 50 lines
- Files longer than 300 lines
- Duplicated code (3+ times)
- Complex nested conditionals (depth > 3)
- More than 4 function parameters
- Unclear variable/function names
- Mixed concerns in one module

## Code Review Checklist

Before committing, verify:
- [ ] No ESLint warnings or errors
- [ ] File size under 300 lines
- [ ] Functions under 50 lines
- [ ] No code duplication
- [ ] Clear, descriptive names
- [ ] Proper error handling
- [ ] TypeScript types defined
- [ ] Comments only where necessary (code should be self-documenting)
