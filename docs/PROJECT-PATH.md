# Project Path Configuration

## Overview

The Project Path feature allows you to specify a subdirectory within your server folder where the actual server files are located. This is useful when your server ZIP file extracts to a subdirectory.

## Use Case

When you upload a server ZIP file like `BM_Revelations_II-2.2.2_server.zip`, it might extract to:

```
server/2025-11-16/
└── BM_Revelations_II-2.2.2_server/
    ├── startserver.sh
    ├── server.properties
    ├── mods/
    └── ...
```

Without setting the project path, the system would look for files in `server/2025-11-16/`, but they're actually in `server/2025-11-16/BM_Revelations_II-2.2.2_server/`.

## How to Set Project Path

1. Navigate to your server in the Server Management view
2. Click the **"📂 Projektpfad"** button in the Server Controls section
3. Browse the folder tree and click on the folder containing your server files
4. The selected path will be displayed at the top
5. Click **Save** to apply the changes

### Visual Folder Browser

The dialog shows an interactive folder tree:
- 📂 Folders can be expanded/collapsed by clicking the arrow
- Click on any folder to select it as the project path
- The currently selected path is highlighted
- Use the "Clear" button to reset to root directory

## What Gets Updated

When you set a project path, the system automatically uses it for:

- **Server Start**: Looks for `startserver.sh` in the correct directory
- **Start File Search**: Searches for start files relative to the project path
- **Configuration Files**: Reads/writes config files from the correct location
- **Server Logs**: Runs the server process in the correct working directory

### Start File Search

The "Find Start Files" feature now searches **relative to the project path**:

- **Without project path**: Searches in `server/2025-11-16/`
- **With project path** (`BM_Revelations_II-2.2.2_server`): Searches in `server/2025-11-16/BM_Revelations_II-2.2.2_server/`

This means you don't need to worry about the full path structure - just set the project path once, and all operations work correctly.

## Technical Details

### Metadata Storage

The project path is stored in the server's `.metadata.json` file:

```json
{
  "customName": "My Modpack Server",
  "description": "...",
  "projectPath": "BM_Revelations_II-2.2.2_server",
  "startFile": "startserver.sh",
  ...
}
```

### Path Resolution

The system uses `getActualServerPath()` to resolve the full path:

```typescript
// Without projectPath
getActualServerPath("2025-11-16") 
// → "./server/2025-11-16"

// With projectPath
getActualServerPath("2025-11-16", "BM_Revelations_II-2.2.2_server")
// → "./server/2025-11-16/BM_Revelations_II-2.2.2_server"
```

### API Endpoint

Update project path via API:

```bash
POST /api/server/metadata
Content-Type: application/json

{
  "project": "2025-11-16",
  "projectPath": "BM_Revelations_II-2.2.2_server"
}
```

## Clearing Project Path

To reset the project path (use root directory):

1. Open the Project Path dialog
2. Clear the input field (leave it empty)
3. Click Save

This will remove the `projectPath` from metadata and use the root server directory.
