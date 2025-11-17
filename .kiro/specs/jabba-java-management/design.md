# Design Document: Jabba Java Management

## Overview

This design modernizes the Docker container and application to use Jabba (Java Version Manager) for dynamic Java version management. The system will:

1. **Container**: Install Bun and Jabba without pre-installed Java, then install OpenJDK 17 as default on first startup
2. **Backend**: Provide APIs for querying installed versions, installing new versions, and switching between versions
3. **Frontend**: Display the active Java version in the GUI and hide installation buttons for already-installed versions
4. **Integration**: Ensure the Minecraft server lifecycle uses the correct Java version from Jabba

The design leverages the existing Java management infrastructure (`src/features/java/` and `src/services/java/`) and extends it to meet the new requirements.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Container                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │    Bun     │  │    Jabba     │  │  OpenJDK 17      │   │
│  │  Runtime   │  │   Installed  │  │  (Default)       │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Bun Server)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Java Service Layer                       │  │
│  │  • javaInfo.ts - System Java detection               │  │
│  │  • jabbaInfo.ts - Jabba status & installed versions  │  │
│  │  • jabbaInstall.ts - Jabba installation              │  │
│  │  • jabbaVersions.ts - Version install/switch         │  │
│  │  • jabbaUtils.ts - Environment setup                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Server Lifecycle Integration                 │  │
│  │  • serverLifecycle.ts - Uses Jabba environment       │  │
│  │  • metadataService.ts - Stores Java version pref     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Java Management Feature                     │  │
│  │  • JavaManagement.tsx - Main container               │  │
│  │  • JavaVersionSelector.tsx - Version UI              │  │
│  │  • JavaInfo.tsx - Active version display             │  │
│  │  • useJavaInfo.ts - Fetch Java/Jabba info           │  │
│  │  • useJabbaInstall.ts - Install/switch operations    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Server Overview Integration                   │  │
│  │  • ServerOverview.tsx - Shows active Java version    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. Container Startup

```
Container Start → Check Jabba → Install if missing → Install OpenJDK 17 → Set as default
```

#### 2. Application Startup

```
Bun Server Start → Load Jabba environment → Set JAVA_HOME & PATH → Ready
```

#### 3. Version Switch Flow

```
User clicks version → Frontend API call → Backend executes jabba use →
Update metadata → Return success → Frontend refreshes → UI updates
```

#### 4. Server Start Flow

```
User starts server → Load metadata → Get Java version →
Load Jabba environment → Set env vars → Spawn server process
```

## Components and Interfaces

### 1. Docker Container

#### Dockerfile Structure

```dockerfile
# Base image: Debian/Ubuntu slim (no Java pre-installed)
FROM debian:bookworm-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Install Jabba
RUN curl -sL https://github.com/shyiko/jabba/raw/master/install.sh | bash
ENV JABBA_HOME="/root/.jabba"
ENV PATH="$JABBA_HOME/bin:$PATH"

# Install OpenJDK 17 as default
RUN jabba install openjdk@1.17.0 && \
    jabba alias default openjdk@1.17.0

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Expose ports
EXPOSE 3000 25565

# Environment
ENV NODE_ENV=production

# Startup script to ensure Jabba environment is loaded
CMD ["bash", "-c", "source ~/.jabba/jabba.sh && jabba use default && bun run start"]
```

#### Key Changes from Current Dockerfile

- **Remove**: `FROM eclipse-temurin:17` (no pre-installed Java)
- **Add**: Jabba installation and OpenJDK 17 setup
- **Add**: Startup script that loads Jabba environment before starting Bun

### 2. Backend Services

#### 2.1 Jabba Info Service (`src/services/java/jabbaInfo.ts`)

**Current State**: Already exists and provides:

- Jabba installation status
- List of installed versions
- Current active version

**Required Changes**: None - already meets requirements

**Interface**:

```typescript
export interface JabbaInfo {
  installed: boolean;
  versions?: string[]; // List of installed versions
  current?: string; // Currently active version
}

export async function getJabbaInfo(): Promise<JabbaInfo>;
```

#### 2.2 Jabba Version Management (`src/services/java/jabbaVersions.ts`)

**Current State**: Already exists with:

- `installJabbaVersion(version: string)` - Install a Java version
- `setJabbaVersion(version: string)` - Switch to a version
- `getAvailableVersions()` - List remote versions

**Required Changes**:

- Ensure `installJabbaVersion` checks if version is already installed before attempting installation
- Return installation status in response

**Enhanced Interface**:

```typescript
export interface VersionInstallResult {
  success: boolean;
  message?: string;
  error?: string;
  alreadyInstalled?: boolean; // NEW: Indicates version was already present
}

export async function installJabbaVersion(
  version: string
): Promise<VersionInstallResult>;
export async function setJabbaVersion(version: string): Promise<ApiResponse>;
export async function getAvailableVersions(): Promise<{
  success: boolean;
  versions?: string[];
}>;
```

#### 2.3 Jabba Environment Utilities (`src/services/java/jabbaUtils.ts`)

**Current State**: Likely exists with environment loading logic

**Required Functionality**:

```typescript
export interface JabbaEnvironment {
  JAVA_HOME: string;
  PATH: string;
}

/**
 * Get environment variables for a specific Jabba Java version
 */
export async function getJabbaEnv(version: string): Promise<JabbaEnvironment>;

/**
 * Check if Jabba is installed on the system
 */
export async function isJabbaInstalled(): Promise<boolean>;

/**
 * Get the path to Jabba home directory
 */
export function getJabbaHome(): string;
```

#### 2.4 Server Lifecycle Integration (`src/services/server/serverLifecycle.ts`)

**Current State**: Already has Jabba integration in `launchServerProcess`:

- Loads metadata to get `javaVersion`
- Calls `getJabbaEnv()` to set environment variables
- Falls back to system Java if no version specified

**Required Changes**:

- Add validation to ensure Java is available before starting server
- Improve error messages when Java version is not installed
- Log which Java version is being used

**Enhanced Logic**:

```typescript
async function ensureJavaAvailable(
  project: string,
  serverPath: string
): Promise<void> {
  const metadata = await readMetadata(project);

  if (metadata?.javaVersion) {
    // Check if the specified Jabba version is installed
    const jabbaInfo = await getJabbaInfo();
    if (!jabbaInfo.versions?.includes(metadata.javaVersion)) {
      throw new Error(
        `Java version ${metadata.javaVersion} is not installed. Please install it first.`
      );
    }
  } else {
    // Check if system Java is available
    const javaInfo = await getJavaInfo();
    if (!javaInfo.installed) {
      throw new Error(
        "No Java installation found. Please install Java or configure a Jabba version."
      );
    }
  }
}
```

#### 2.5 Metadata Service (`src/services/metadataService.ts`)

**Current State**: Already stores `javaVersion` in metadata

**Required Changes**: None - already supports storing Java version preference

**Interface**:

```typescript
export interface ServerMetadata {
  // ... existing fields
  javaVersion?: string; // Jabba version identifier (e.g., "openjdk@1.17.0")
}
```

### 3. Frontend Components

#### 3.1 Java Version Selector (`src/features/java/JavaVersionSelector.tsx`)

**Current State**: Displays installed versions and allows switching

**Required Changes**:

1. Hide/disable install button for already-installed versions
2. Show visual indicator for installed vs. not-installed versions
3. Display installation status during install operations

**Enhanced Component**:

```typescript
interface JavaVersionSelectorProps {
  jabbaInfo: JabbaInfo | null;
  installing: boolean;
  switching: boolean;
  onInstallVersion: (version: string) => void;
  onSwitchVersion: (version: string) => void;
}

// UI Logic:
// - For each recommended version:
//   - If installed: Show "Switch" button or "Active" badge
//   - If not installed: Show "Install" button
// - Disable all buttons during install/switch operations
```

**UI Mockup**:

```
┌─────────────────────────────────────────────────┐
│ Java Versions                                   │
├─────────────────────────────────────────────────┤
│ Current: openjdk@1.17.0                         │
├─────────────────────────────────────────────────┤
│ Recommended Versions:                           │
│                                                 │
│ ✓ openjdk@1.17.0          [Active]            │
│ ✓ openjdk@1.16.0          [Switch]            │
│ ○ adopt@1.11.0-11         [Install]           │
│ ○ zulu@1.8.282            [Install]           │
└─────────────────────────────────────────────────┘
```

#### 3.2 Java Info Display (`src/features/java/JavaInfo.tsx`)

**Current State**: Shows system Java information

**Required Changes**:

- Display Jabba-managed Java version prominently
- Show both system Java and Jabba Java if different

**Enhanced Display**:

```typescript
// Show active Jabba version at top
// Show system Java as fallback info
```

#### 3.3 Server Overview Integration (`src/components/server/ServerOverview.tsx`)

**Current State**: Main server management view

**Required Changes**:

- Add Java version display in server info section
- Show which Java version will be used when server starts
- Link to Java Management page

**New Section**:

```
┌─────────────────────────────────────────────────┐
│ Server Information                              │
├─────────────────────────────────────────────────┤
│ Java Version: openjdk@1.17.0    [Change]      │
│ Start File: startserver.sh                     │
│ Project Path: BM_Revelations_II-2.2.2_server  │
└─────────────────────────────────────────────────┘
```

#### 3.4 Hooks

**useJavaInfo** (`src/features/java/useJavaInfo.ts`)

- **Current**: Fetches Java and Jabba info
- **Changes**: None required - already functional

**useJabbaInstall** (`src/features/java/useJabbaInstall.ts`)

- **Current**: Handles install and switch operations
- **Changes**:
  - Handle `alreadyInstalled` response from backend
  - Skip installation if version already exists
  - Provide better error messages

## Data Models

### Server Metadata (Extended)

```typescript
interface ServerMetadata {
  customName: string;
  description: string;
  createdAt: string;
  lastModified: string;
  sourceZipFile: string;
  startFile?: string;
  projectPath?: string;
  javaVersion?: string; // Format: "provider@version" (e.g., "openjdk@1.17.0")
  modpackInfo?: {
    name: string;
    version: string;
  };
  rcon?: {
    host: string;
    port: number;
    password: string;
  };
}
```

### Jabba Version Format

Jabba uses the format: `provider@version`

**Examples**:

- `openjdk@1.17.0` - OpenJDK 17
- `openjdk@1.16.0` - OpenJDK 16
- `adopt@1.11.0-11` - AdoptOpenJDK 11
- `zulu@1.8.282` - Azul Zulu Java 8

### API Response Types

```typescript
interface JabbaInfo {
  installed: boolean;
  versions?: string[]; // Installed versions
  current?: string; // Active version
}

interface JavaInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

interface VersionInstallResult {
  success: boolean;
  message?: string;
  error?: string;
  alreadyInstalled?: boolean;
}

interface VersionSwitchResult {
  success: boolean;
  message?: string;
  error?: string;
}
```

## Error Handling

### Container Build Errors

**Scenario**: Jabba installation fails during Docker build

**Handling**:

- Dockerfile should fail fast if Jabba installation fails
- Log clear error message indicating Jabba installation failure
- Provide fallback: Allow container to start without Jabba (use system Java if available)

### Runtime Errors

#### 1. Jabba Not Installed (Non-Docker Environment)

**Detection**: `isJabbaInstalled()` returns false

**Handling**:

- Frontend displays message: "Jabba is not installed. Install Jabba to manage Java versions."
- Provide installation instructions or link
- Allow application to continue with system Java

#### 2. Java Version Not Installed

**Scenario**: User tries to start server with a Java version that's not installed

**Handling**:

- Backend validates Java version before starting server
- Return error: "Java version X is not installed. Please install it first."
- Frontend displays error and suggests installing the version

#### 3. Version Installation Failure

**Scenario**: `jabba install` command fails

**Handling**:

- Capture stderr from Jabba command
- Return detailed error message to frontend
- Log full error details on backend
- Frontend displays user-friendly error with retry option

#### 4. Version Switch Failure

**Scenario**: `jabba use` command fails

**Handling**:

- Validate version exists before attempting switch
- Return error if version not installed
- Log error details
- Frontend displays error and suggests installing version first

### Validation Rules

1. **Before Server Start**:

   - Validate Java version is installed (if specified in metadata)
   - Validate start file exists
   - Validate server directory exists

2. **Before Version Install**:

   - Check if version already installed (skip if yes)
   - Validate version format
   - Check network connectivity (for remote download)

3. **Before Version Switch**:
   - Validate version is installed
   - Validate version format

## Testing Strategy

### Unit Tests (Optional)

**Backend Services**:

- `jabbaInfo.ts`: Test parsing of `jabba ls` output
- `jabbaVersions.ts`: Test version install/switch logic
- `jabbaUtils.ts`: Test environment variable generation

**Frontend Hooks**:

- `useJavaInfo.ts`: Test data fetching and state management
- `useJabbaInstall.ts`: Test install/switch operations

### Integration Tests (Optional)

**Container Tests**:

- Build Docker image and verify Jabba is installed
- Verify OpenJDK 17 is installed and set as default
- Verify Bun is available

**API Tests**:

- Test `/api/java/jabba/info` returns correct data
- Test `/api/java/jabba/install-version` installs a version
- Test `/api/java/jabba/use` switches versions

**End-to-End Tests** (Optional):

- Create server with specific Java version
- Start server and verify correct Java version is used
- Switch Java version and restart server
- Verify new version is used

### Manual Testing Scenarios

1. **Fresh Container Start**:

   - Build and start container
   - Verify OpenJDK 17 is installed and active
   - Verify web UI shows correct Java version

2. **Install New Version**:

   - Navigate to Java Management
   - Install a new Java version (e.g., OpenJDK 16)
   - Verify installation succeeds
   - Verify version appears in installed list
   - Verify install button is hidden after installation

3. **Switch Version**:

   - Switch to newly installed version
   - Verify active version updates in UI
   - Verify server uses new version on next start

4. **Server Start with Specific Version**:

   - Set Java version in server metadata
   - Start server
   - Verify correct Java version is used (check logs)

5. **Non-Docker Environment**:
   - Run application without Docker
   - Verify Jabba detection works
   - Verify fallback to system Java if Jabba not installed

## Implementation Notes

### Jabba Commands Reference

```bash
# Install Jabba
curl -sL https://github.com/shyiko/jabba/raw/master/install.sh | bash

# List installed versions
jabba ls

# List available remote versions
jabba ls-remote

# Install a version
jabba install openjdk@1.17.0

# Switch to a version
jabba use openjdk@1.17.0

# Set default version
jabba alias default openjdk@1.17.0

# Get environment for a version
jabba which openjdk@1.17.0
```

### Environment Variables

When using a Jabba-managed Java version:

```bash
JAVA_HOME=/root/.jabba/jdk/openjdk@1.17.0
PATH=/root/.jabba/jdk/openjdk@1.17.0/bin:$PATH
```

### Bun Process Spawning

When spawning server process with Jabba Java:

```typescript
const env = {
  ...process.env,
  JAVA_HOME: jabbaEnv.JAVA_HOME,
  PATH: jabbaEnv.PATH,
};

const serverProcess = Bun.spawn(["bash", "-c", command], {
  cwd: serverPath,
  env,
  // ... other options
});
```

### Metadata Storage

Java version preference is stored in `.metadata.json`:

```json
{
  "customName": "My Server",
  "javaVersion": "openjdk@1.17.0",
  "startFile": "startserver.sh",
  ...
}
```

## Security Considerations

1. **Command Injection**: Validate Java version format before passing to shell commands
2. **Path Traversal**: Validate Jabba home path and Java installation paths
3. **Resource Limits**: Limit number of concurrent Java version installations
4. **Network Security**: Jabba downloads from GitHub - ensure HTTPS is used

## Performance Considerations

1. **Container Build Time**: Installing Jabba and OpenJDK 17 adds ~2-3 minutes to build
2. **Version Installation**: Installing a new Java version takes ~1-2 minutes
3. **Version Switching**: Switching versions is instant (just updates symlinks)
4. **Startup Time**: Loading Jabba environment adds negligible overhead (<100ms)

## Backward Compatibility

### Existing Servers

Servers created before this change will:

- Continue to work with system Java (if no `javaVersion` in metadata)
- Can be migrated to Jabba by setting `javaVersion` in metadata
- No breaking changes to existing functionality

### Migration Path

1. Deploy new container with Jabba
2. Existing servers use system Java by default
3. Users can optionally set Java version per server
4. Gradual migration as users configure Java versions

## Future Enhancements

1. **Auto-detect Required Java Version**: Parse modpack manifest to determine required Java version
2. **Java Version Recommendations**: Suggest optimal Java version based on Minecraft version
3. **Bulk Version Management**: Install/remove multiple versions at once
4. **Version Profiles**: Save and reuse Java version configurations
5. **Performance Monitoring**: Track server performance with different Java versions
