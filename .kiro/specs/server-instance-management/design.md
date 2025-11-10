# Design Document

## Overview

This design document outlines the implementation approach for enhancing the Minecraft Server Management Interface with custom server naming, improved metadata persistence, and better user experience. The solution builds upon the existing architecture while introducing a metadata layer that persists across container restarts through Docker volume mounts.

The core enhancement is the introduction of a `.metadata.json` file in each server directory that stores custom names, descriptions, and other server-specific information. This approach ensures data persistence while maintaining backward compatibility with existing servers.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Interface (React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Welcome     │  │  Project     │  │  Server          │  │
│  │  Page        │  │  Selection   │  │  Management      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Bun Server)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Server      │  │  Metadata    │  │  Config          │  │
│  │  Service     │  │  Service     │  │  Service         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  File System (Docker Volume)                 │
│                                                               │
│  server/                                                      │
│  ├── 2024-11-10/                                            │
│  │   ├── .metadata.json    ← New metadata file             │
│  │   ├── .created                                           │
│  │   ├── server.properties                                  │
│  │   └── ... (other server files)                          │
│  └── 2024-11-11/                                            │
│      ├── .metadata.json                                     │
│      └── ...                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Server Creation Flow**:

   - User uploads ZIP file → stored in `serverfiles/`
   - User provides custom name (optional) and description
   - System creates server directory with date-based name
   - System extracts ZIP contents
   - System creates `.metadata.json` with user-provided information
   - System creates `.created` timestamp file

2. **Server Listing Flow**:

   - System scans `server/` directory for subdirectories
   - For each directory, system reads `.metadata.json`
   - If metadata missing, system generates default metadata
   - System checks server running status
   - System returns enriched server list to frontend

3. **Server Rename Flow**:
   - User initiates rename from server management view
   - Frontend displays dialog with current name
   - User submits new name
   - Backend validates name and updates `.metadata.json`
   - Frontend refreshes display without page reload

## Components and Interfaces

### New Metadata Service

**File**: `src/services/metadataService.ts`

```typescript
export interface ServerMetadata {
  customName: string;
  description: string;
  createdAt: string;
  lastModified: string;
  sourceZipFile: string;
  modpackInfo?: {
    name: string;
    version: string;
  };
}

// API Functions
export async function readMetadata(
  projectPath: string
): Promise<ServerMetadata | null>;
export async function writeMetadata(
  projectPath: string,
  metadata: ServerMetadata
): Promise<void>;
export async function updateMetadata(
  projectPath: string,
  updates: Partial<ServerMetadata>
): Promise<void>;
export async function migrateMetadata(
  projectPath: string
): Promise<ServerMetadata>;
```

### Updated Type Definitions

**File**: `src/services/types.ts`

```typescript
export interface Server {
  name: string; // Display name (custom or default)
  path: string; // Directory name (e.g., "2024-11-10")
  createdAt: string;
  customName?: string; // User-defined name
  description?: string; // User-defined description
  sourceZipFile?: string; // Original ZIP filename
  status?: "running" | "stopped"; // Current server status
  lastModified?: string; // Last metadata update
}

export interface ServerMetadata {
  customName: string;
  description: string;
  createdAt: string;
  lastModified: string;
  sourceZipFile: string;
  modpackInfo?: {
    name: string;
    version: string;
  };
}
```

### API Endpoints

**New Endpoints**:

```typescript
// Update server metadata (rename, change description)
POST /api/server/metadata
Body: { project: string, customName?: string, description?: string }
Response: { success: boolean, metadata: ServerMetadata }

// Delete server instance
DELETE /api/server/delete
Query: ?project=<projectPath>
Response: { success: boolean, message: string }
```

**Updated Endpoints**:

```typescript
// Enhanced server listing with metadata
GET /api/servers
Response: {
  servers: Server[],  // Now includes customName, description, status
  count: number
}

// Enhanced server creation with custom name
POST /api/create-server
Body: {
  serverFile: string,
  customName?: string,
  description?: string
}
Response: {
  status: 'success' | 'exists' | 'error',
  serverPath: string,
  metadata: ServerMetadata
}
```

## Data Models

### Metadata File Structure

**File**: `server/<project>/.metadata.json`

```json
{
  "customName": "ATM9 Survival Server",
  "description": "All The Mods 9 survival world for friends",
  "createdAt": "2024-11-10T14:30:00.000Z",
  "lastModified": "2024-11-10T14:30:00.000Z",
  "sourceZipFile": "ATM9-Server-0.2.60.zip",
  "modpackInfo": {
    "name": "All The Mods 9",
    "version": "0.2.60"
  }
}
```

### Migration Strategy for Existing Servers

For servers without `.metadata.json`:

1. Check for `.created` file → use as `createdAt`
2. Use directory name as initial `customName`
3. Set `description` to empty string
4. Set `sourceZipFile` to "Unknown (migrated)"
5. Set `lastModified` to current timestamp
6. Write generated metadata to `.metadata.json`

## Error Handling

### Metadata Read Errors

- **File not found**: Generate default metadata via migration
- **JSON parse error**: Log error, generate default metadata
- **Permission error**: Return error to frontend with appropriate message

### Metadata Write Errors

- **Permission denied**: Return 500 error with message
- **Disk full**: Return 507 error with message
- **Invalid JSON**: Validate before writing, return 400 error

### Server Deletion Errors

- **Server running**: Stop server first, then delete
- **Permission denied**: Return 403 error
- **Directory not empty**: Force recursive deletion
- **Path traversal attempt**: Validate path, return 403 error

### Validation Rules

**Custom Name**:

- Required: No (defaults to ZIP filename)
- Min length: 1 character
- Max length: 100 characters
- Allowed characters: Letters, numbers, spaces, hyphens, underscores
- Regex: `^[a-zA-Z0-9\s\-_]+$`

**Description**:

- Required: No
- Max length: 500 characters
- Allowed: Any printable characters

**Project Path**:

- Must exist in `server/` directory
- No path traversal (`..`) allowed
- Must be alphanumeric with hyphens

## Testing Strategy

### Unit Tests

**Metadata Service Tests**:

- Test reading valid metadata file
- Test reading missing metadata file (migration)
- Test reading corrupted metadata file
- Test writing new metadata
- Test updating existing metadata
- Test validation of custom names
- Test validation of descriptions

**Server Service Tests**:

- Test server creation with custom name
- Test server creation without custom name
- Test server listing with metadata
- Test server deletion
- Test server deletion while running

### Integration Tests

**End-to-End Flows**:

1. Create server with custom name → verify metadata file created
2. Create server without custom name → verify default name used
3. Rename server → verify metadata updated
4. Delete server → verify directory removed
5. Container restart → verify metadata persists

### Manual Testing Scenarios

1. **New Server Creation**:

   - Upload ZIP file
   - Enter custom name "Test Server"
   - Enter description "Testing custom names"
   - Verify server appears with custom name in project list
   - Restart container
   - Verify custom name persists

2. **Server Renaming**:

   - Open existing server
   - Click rename button
   - Enter new name "Renamed Server"
   - Verify name updates immediately
   - Navigate back to project list
   - Verify new name displayed

3. **Migration**:

   - Create server using old method (no metadata)
   - Restart application
   - Verify server appears with directory name as default
   - Rename server
   - Verify metadata file created

4. **Server Deletion**:
   - Start a server
   - Attempt to delete
   - Verify confirmation dialog appears
   - Confirm deletion
   - Verify server stopped and removed

## UI/UX Design

### Welcome Page Enhancements

**Custom Name Input**:

- Add text input field below server file selection
- Label: "Server Name (optional)"
- Placeholder: "e.g., ATM9 Survival, Tekkit Creative"
- Helper text: "Leave empty to use ZIP filename"

**Description Input**:

- Add textarea below custom name
- Label: "Description (optional)"
- Placeholder: "Describe your server..."
- Max length indicator: "0/500 characters"

### Project Selection Enhancements

**Server Card Layout**:

```
┌─────────────────────────────────────────────────┐
│  🟢 Running                                      │
│                                                  │
│  ATM9 Survival Server                           │
│  All The Mods 9 survival world for friends      │
│                                                  │
│  Created: Nov 10, 2024                          │
│  Source: ATM9-Server-0.2.60.zip                 │
│  Path: server/2024-11-10                        │
│                                                  │
│  [Select Server]                                │
└─────────────────────────────────────────────────┘
```

**Status Badge**:

- Green badge with "Running" for active servers
- Gray badge with "Stopped" for inactive servers
- Position: Top-right corner of card

### Server Management Enhancements

**Rename Dialog**:

```
┌─────────────────────────────────────────────────┐
│  Rename Server                              [X] │
│                                                  │
│  Current name: ATM9 Survival Server             │
│                                                  │
│  New name:                                      │
│  ┌─────────────────────────────────────────┐   │
│  │ ATM9 Survival Server                    │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [Cancel]                    [Save]             │
└─────────────────────────────────────────────────┘
```

**Delete Confirmation Dialog**:

```
┌─────────────────────────────────────────────────┐
│  Delete Server                              [X] │
│                                                  │
│  ⚠️ Warning: This action cannot be undone!      │
│                                                  │
│  You are about to delete:                       │
│  ATM9 Survival Server (2024-11-10)              │
│                                                  │
│  Type the server name to confirm:               │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [Cancel]                    [Delete]           │
└─────────────────────────────────────────────────┘
```

**Server Info Section**:

- Add "Custom Name" field (editable)
- Add "Description" field (editable)
- Add "Rename" button
- Add "Delete Server" button (red, bottom of page)

## Implementation Notes

### File System Considerations

- All metadata stored in Docker volume (`/app/server`)
- Metadata files are small (<1KB) and fast to read/write
- Use atomic writes to prevent corruption
- Implement file locking if concurrent access becomes an issue

### Performance Considerations

- Metadata reading is synchronous and fast (<1ms per file)
- Server listing scans all directories but caches results
- Status checking uses existing `runningServers` Map
- No database required - file system is the source of truth

### Security Considerations

- Validate all user input (custom names, descriptions)
- Prevent path traversal attacks in project paths
- Sanitize filenames before file operations
- Require confirmation for destructive operations (delete)
- Limit description length to prevent storage abuse

### Backward Compatibility

- Existing servers without metadata continue to work
- Migration happens automatically on first access
- Old `.created` files remain for reference
- No breaking changes to existing API endpoints

### Internationalization

Update `src/lib/i18n.ts` with new translation keys:

```typescript
{
  serverCreation: {
    customNameLabel: string;
    customNamePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
  },
  serverManagement: {
    renameButton: string;
    deleteButton: string;
    renameDialog: {
      title: string;
      currentName: string;
      newNameLabel: string;
      cancel: string;
      save: string;
    },
    deleteDialog: {
      title: string;
      warning: string;
      confirmLabel: string;
      cancel: string;
      delete: string;
    }
  }
}
```
