# Design Document

## Overview

This design document outlines the architectural approach for refactoring the Minecraft Server Manager codebase to achieve Clean Code compliance. The refactoring will be executed in 10 phases, prioritizing high-impact changes that reduce file sizes, function complexity, and nesting depth while implementing proper architectural patterns.

The refactoring follows a systematic approach: fix critical errors first, then tackle large files with the biggest impact, followed by component organization, and finally address remaining quality issues. The WelcomePage feature (src/features/welcome/) serves as the reference implementation demonstrating all desired patterns.

## Architecture

### Backend Layered Architecture

The backend will be restructured into three distinct layers following the Layered Architecture pattern:

```
┌─────────────────────────────────────┐
│     Routes / Controllers Layer      │  ← HTTP handling, validation
├─────────────────────────────────────┤
│      Services / Business Logic      │  ← Coordination, business rules
├─────────────────────────────────────┤
│   Repositories / Data Access Layer  │  ← File system, data operations
└─────────────────────────────────────┘
```

**Routes/Controllers Layer:**
- Handles HTTP requests and responses
- Validates request data
- Delegates to service layer
- Returns appropriate HTTP status codes
- Should be thin (<30 lines per handler)

**Services Layer:**
- Contains business logic
- Coordinates operations
- Calls repository layer for data access
- No knowledge of HTTP (Request/Response objects)
- Functions should be <50 lines, complexity ≤10

**Repository Layer:**
- Isolates all file system operations
- Abstracts data access patterns
- Provides clean interfaces for data operations
- Services never directly access file system

### Frontend Feature-based Architecture

Components will be organized by feature rather than by type:

```
src/features/
├── welcome/              # Reference implementation
│   ├── WelcomePage.tsx
│   ├── ServerFileUpload.tsx
│   ├── ServerFileSelector.tsx
│   ├── ServerFileList.tsx
│   └── useServerFileUpload.ts
├── java/                 # Java management feature
│   ├── JavaManagement.tsx
│   ├── JavaInfo.tsx
│   ├── JabbaInstall.tsx
│   ├── JavaVersionSelector.tsx
│   ├── useJavaInfo.ts
│   └── useJabbaInstall.ts
├── config/               # Configuration management
│   ├── ConfigurationManagement.tsx
│   ├── ConfigFileList.tsx
│   ├── ConfigEditor.tsx
│   └── useConfigFiles.ts
└── server/               # Server management components
    ├── ServerOverview.tsx
    ├── ServerControls.tsx
    ├── ServerLogs.tsx
    ├── ServerInfoCard.tsx
    └── useServerStatus.ts
```

**Benefits:**
- Related code is co-located
- Features can be developed independently
- Easier to understand feature scope
- Simpler to test and maintain
- Clear boundaries between features

## Components and Interfaces

### Service Layer Decomposition

#### Server Service Refactoring

**Current:** serverService.ts (588 lines)

**New Structure:**
```typescript
// services/server/index.ts
export { listServers } from './serverList';
export { createServer } from './serverCreate';
export { startServer, stopServer } from './serverLifecycle';

// services/server/server.types.ts
export interface ServerMetadata {
  name: string;
  description?: string;
  createdAt: string;
  startFile?: string;
}

export interface CreateServerData {
  serverFile: string;
  customName?: string;
  description?: string;
}

// services/server/serverRepository.ts
export async function readServerDirectory(path: string): Promise<string[]>
export async function writeServerFile(path: string, content: string): Promise<void>
export async function deleteServerDirectory(path: string): Promise<void>

// services/server/serverList.ts (~80 lines)
export async function listServers(): Promise<ServerInfo[]>

// services/server/serverCreate.ts (~150 lines)
export async function createServer(data: CreateServerData): Promise<ServerResult>
// Decomposed into:
// - validateServerCreation()
// - setupServerDirectory()
// - extractServerFiles()
// - createServerMetadata()
// - cleanupTempFiles()

// services/server/serverLifecycle.ts (~280 lines)
export async function startServer(serverName: string): Promise<ServerProcess>
// Decomposed into:
// - validateServerStart()
// - loadServerConfiguration()
// - ensureJavaAvailable()
// - launchServerProcess()
// - setupProcessHandlers()

export async function stopServer(serverName: string): Promise<void>
```

#### Server File Service Refactoring

**Current:** serverFileService.ts (401 lines)

**New Structure:**
```typescript
// services/serverFile/index.ts
export { listServerFiles, deleteServerFile } from './serverFileList';
export { uploadServerFile } from './serverFileUpload';
export { uploadServerFileChunked } from './serverFileUploadChunked';
export { uploadServerFileStream } from './serverFileUploadStream';

// services/serverFile/serverFileList.ts (~100 lines)
export async function listServerFiles(): Promise<ServerFile[]>
export async function deleteServerFile(filename: string): Promise<void>

// services/serverFile/serverFileUpload.ts (~50 lines)
export async function uploadServerFile(file: File): Promise<UploadResult>

// services/serverFile/serverFileUploadChunked.ts (~100 lines)
export async function uploadServerFileChunked(chunks: Chunk[]): Promise<UploadResult>
// Decomposed to reduce complexity from 18 to <10

// services/serverFile/serverFileUploadStream.ts (~100 lines)
export async function uploadServerFileStream(stream: ReadableStream): Promise<UploadResult>
// Decomposed to reduce complexity from 20 to <10
```

### Component Decomposition

#### Java Management Feature

**Current:** JavaManagement.tsx (319 lines, complexity 13)

**New Structure:**
```typescript
// features/java/JavaManagement.tsx (~100 lines)
export function JavaManagement() {
  const { javaInfo, loading, refresh } = useJavaInfo();
  const { install, installing } = useJabbaInstall();
  
  return (
    <div>
      <JavaInfo info={javaInfo} loading={loading} />
      <JabbaInstall onInstall={install} installing={installing} />
      <JavaVersionSelector versions={javaInfo.versions} />
    </div>
  );
}

// features/java/JavaInfo.tsx (~80 lines)
export function JavaInfo({ info, loading }: Props) {
  // Display Java information
}

// features/java/JabbaInstall.tsx (~80 lines)
export function JabbaInstall({ onInstall, installing }: Props) {
  // Jabba installation UI
}

// features/java/JavaVersionSelector.tsx (~60 lines)
export function JavaVersionSelector({ versions }: Props) {
  // Version selection UI
}

// features/java/useJavaInfo.ts (~60 lines)
export function useJavaInfo() {
  // Java info fetching logic
}

// features/java/useJabbaInstall.ts (~60 lines)
export function useJabbaInstall() {
  // Installation logic
}
```

#### Configuration Management Feature

**Current:** ConfigurationManagement.tsx (248 lines, complexity 13)

**New Structure:**
```typescript
// features/config/ConfigurationManagement.tsx (~80 lines)
export function ConfigurationManagement({ serverName }: Props) {
  const { files, selectedFile, selectFile, saveFile } = useConfigFiles(serverName);
  
  return (
    <div>
      <ConfigFileList files={files} onSelect={selectFile} />
      <ConfigEditor file={selectedFile} onSave={saveFile} />
    </div>
  );
}

// features/config/ConfigFileList.tsx (~80 lines)
export function ConfigFileList({ files, onSelect }: Props) {
  // File list UI
}

// features/config/ConfigEditor.tsx (~80 lines)
export function ConfigEditor({ file, onSave }: Props) {
  // Editor UI with syntax highlighting
}

// features/config/useConfigFiles.ts (~80 lines)
export function useConfigFiles(serverName: string) {
  // Config file management logic
}
```

## Data Models

### Type Definitions

All shared types will be defined in dedicated `.types.ts` files:

```typescript
// services/server/server.types.ts
export interface ServerMetadata {
  name: string;
  description?: string;
  createdAt: string;
  startFile?: string;
  javaVersion?: string;
}

export interface ServerInfo {
  name: string;
  path: string;
  metadata: ServerMetadata;
  status: 'running' | 'stopped' | 'unknown';
}

export interface CreateServerData {
  serverFile: string;
  customName?: string;
  description?: string;
}

export interface ServerProcess {
  pid: number;
  name: string;
  startedAt: Date;
}

// services/serverFile/serverFile.types.ts
export interface ServerFile {
  name: string;
  size: number;
  uploadedAt: string;
  path: string;
}

export interface UploadResult {
  success: boolean;
  filename: string;
  size: number;
}

export interface UploadChunk {
  index: number;
  data: ArrayBuffer;
  total: number;
}
```

## Error Handling

### Standardized Error Handling Pattern

All functions will follow consistent error handling:

```typescript
// Service layer
export async function createServer(data: CreateServerData): Promise<ServerResult> {
  try {
    await validateServerCreation(data);
    const serverPath = await setupServerDirectory(data);
    await extractServerFiles(data.serverFile, serverPath);
    await createServerMetadata(serverPath, data);
    
    return { success: true, serverPath };
  } catch (error) {
    logger.error('Failed to create server:', error);
    throw new Error(`Server creation failed: ${error.message}`);
  }
}

// Repository layer
async function writeServerFile(path: string, content: string): Promise<void> {
  try {
    await fs.writeFile(path, content);
  } catch (error) {
    logger.error(`Failed to write file ${path}:`, error);
    throw new Error(`File write failed: ${error.message}`);
  }
}

// Intentionally ignored errors
async function cleanupTempFiles(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (_error) {
    // Ignore cleanup errors - file may not exist
    logger.debug(`Cleanup skipped for ${filePath}`);
  }
}
```

### Error Logging

Replace all console.log/error/warn with structured logger:

```typescript
import { logger } from '@/lib/logger';

// Before
console.log('Server starting...');
console.error('Failed:', error);

// After
logger.info('Server starting...');
logger.error('Failed:', error);
```

## Testing Strategy

### Unit Testing Approach

Each refactored module should be testable in isolation:

```typescript
// Example: Testing serverCreate.ts
describe('createServer', () => {
  it('should create server with valid data', async () => {
    const data = {
      serverFile: '/path/to/server.zip',
      customName: 'TestServer'
    };
    
    const result = await createServer(data);
    
    expect(result.success).toBe(true);
    expect(result.serverPath).toContain('TestServer');
  });
  
  it('should throw error for missing server file', async () => {
    const data = { serverFile: '' };
    
    await expect(createServer(data)).rejects.toThrow('Server file is required');
  });
});

// Example: Testing custom hook
describe('useJavaInfo', () => {
  it('should fetch Java info on mount', async () => {
    const { result } = renderHook(() => useJavaInfo());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.javaInfo).toBeDefined();
  });
});
```

### Integration Testing

Test that refactored layers work together:

```typescript
describe('Server Lifecycle Integration', () => {
  it('should create and start server', async () => {
    // Create server
    const createResult = await createServer({
      serverFile: testServerZip,
      customName: 'IntegrationTest'
    });
    
    expect(createResult.success).toBe(true);
    
    // Start server
    const process = await startServer('IntegrationTest');
    
    expect(process.pid).toBeGreaterThan(0);
    
    // Stop server
    await stopServer('IntegrationTest');
  });
});
```

### Manual Testing Checklist

After each phase, verify:

- [ ] Server can be created from ZIP file
- [ ] Server can be started and stopped
- [ ] Server logs display correctly
- [ ] Configuration files can be edited
- [ ] Java management works
- [ ] File uploads work (all three methods)
- [ ] No console errors in browser
- [ ] No ESLint errors: `bun lint`

## Refactoring Patterns

### Pattern 1: Function Decomposition

Break large functions into smaller, focused functions:

```typescript
// Before: 142 lines, complexity 21
export async function createServer(data: CreateServerData) {
  // Validation (20 lines)
  // Directory setup (30 lines)
  // File extraction (40 lines)
  // Metadata creation (30 lines)
  // Cleanup (20 lines)
}

// After: 5 functions, each <30 lines, complexity <10
export async function createServer(data: CreateServerData) {
  await validateServerCreation(data);
  const serverPath = await setupServerDirectory(data);
  await extractServerFiles(data.serverFile, serverPath);
  await createServerMetadata(serverPath, data);
  await cleanupTempFiles(data.serverFile);
  return { success: true, serverPath };
}
```

### Pattern 2: Guard Clauses (Early Returns)

Reduce nesting by using guard clauses:

```typescript
// Before: Nesting depth 5
function process(data) {
  if (data) {
    if (data.isValid) {
      if (data.hasPermission) {
        if (data.isActive) {
          if (data.canProcess) {
            // Logic here
          }
        }
      }
    }
  }
}

// After: Nesting depth 1
function process(data) {
  if (!data) return;
  if (!data.isValid) return;
  if (!data.hasPermission) return;
  if (!data.isActive) return;
  if (!data.canProcess) return;
  
  // Logic here
}
```

### Pattern 3: Extract Custom Hooks

Move complex logic from components to hooks:

```typescript
// Before: Component with 200 lines of logic
function JavaManagement() {
  const [javaInfo, setJavaInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchJavaInfo = async () => {
    setLoading(true);
    // 50 lines of logic
    setLoading(false);
  };
  
  useEffect(() => {
    fetchJavaInfo();
  }, []);
  
  // More logic...
}

// After: Component with hook
function JavaManagement() {
  const { javaInfo, loading, refresh } = useJavaInfo();
  
  return <JavaInfo info={javaInfo} loading={loading} />;
}

// Hook with logic
function useJavaInfo() {
  const [javaInfo, setJavaInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchJavaInfo = useCallback(async () => {
    setLoading(true);
    // Logic here
    setLoading(false);
  }, []);
  
  useEffect(() => {
    fetchJavaInfo();
  }, [fetchJavaInfo]);
  
  return { javaInfo, loading, refresh: fetchJavaInfo };
}
```

## Implementation Phases

The refactoring will be executed in 10 phases, prioritized by impact and dependencies:

1. **Phase 1:** Fix critical error (5 min) - Empty catch block
2. **Phase 2:** Refactor large services (2-3 hours) - Biggest impact on metrics
3. **Phase 3:** Refactor large components (1-2 hours) - Feature organization
4. **Phase 4:** Optimize small components (30 min) - Quick wins
5. **Phase 5:** Optimize hooks (30 min) - Extract logic
6. **Phase 6:** Replace console.log (30 min) - Many warnings fixed
7. **Phase 7:** Fix React dependencies (15 min) - Quick fixes
8. **Phase 8:** Remove TypeScript any (30 min) - Type safety
9. **Phase 9:** Clean unused variables (15 min) - Quick fixes
10. **Phase 10:** Reduce nesting (1 hour) - Guard clauses

**Total Estimated Time:** 6-8 hours

## Success Metrics

### Quantitative Goals

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| ESLint Errors | 1 | 0 | 🔴 Critical |
| ESLint Warnings | 172 | <20 | 🔴 High |
| Files >300 lines | 3 | 0 | 🔴 High |
| Functions >50 lines | ~40 | <10 | 🟡 Medium |
| Max Complexity | 21 | ≤10 | 🟡 Medium |
| Max Nesting | 5 | ≤3 | 🟡 Medium |
| console.log usage | ~40 | 0 | 🟢 Low |
| TypeScript any | ~10 | 0 | 🟡 Medium |

### Qualitative Goals

- All features continue to work without regression
- Code is more readable and maintainable
- New developers can understand code structure quickly
- Testing is easier due to better separation of concerns
- Future changes are less likely to introduce bugs

## Design Decisions and Rationales

### Decision 1: Layered Architecture for Backend

**Rationale:** Separating routes, services, and repositories creates clear boundaries and makes code easier to test and maintain. Each layer has a single responsibility and can be modified independently.

### Decision 2: Feature-based Frontend Structure

**Rationale:** Grouping related components, hooks, and utilities by feature makes it easier to understand and modify features. The WelcomePage refactoring demonstrates this pattern successfully.

### Decision 3: Incremental Refactoring

**Rationale:** Refactoring in phases allows for testing and validation after each change, reducing risk of breaking functionality. High-impact changes are prioritized first.

### Decision 4: WelcomePage as Reference

**Rationale:** The WelcomePage has already been successfully refactored and demonstrates all desired patterns. Using it as a reference ensures consistency across the codebase.

### Decision 5: Logger over console

**Rationale:** A structured logger provides better control over log levels, formatting, and output destinations. It's easier to disable or redirect logs in production.

### Decision 6: Explicit Types over any

**Rationale:** TypeScript's type system catches errors at compile time. Using 'any' defeats this purpose and should be avoided. Where types are truly unknown, 'unknown' is safer.
