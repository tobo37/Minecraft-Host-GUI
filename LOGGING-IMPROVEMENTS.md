# Logging Improvements for Container Debugging

## Changes Made

### 1. Enhanced Logger (`src/lib/logger.ts`)

- **Always log in production**: Removed the production environment check that was suppressing logs
- **Added timestamps**: All log messages now include ISO timestamps for better debugging
- **Format**: `[2025-11-17T10:30:45.123Z] [INFO] Message`

### 2. Startup Logging (`src/index.ts`)

Added comprehensive startup diagnostics:

- Environment information (NODE_ENV, platform, architecture, Bun version)
- Working directory verification
- Critical directory checks (`server/`, `serverfiles/`)
- Java availability check with version detection
- Jabba environment loading status
- HTTP server startup confirmation with URL and port

### 3. Server Lifecycle Logging (`src/services/server/serverLifecycle.ts`)

Enhanced logging for server start/stop operations:

- **Server start**: Detailed logging of project, paths, and validation
- **Java checks**: Version detection and availability confirmation
- **Process launch**: Command being executed, working directory, platform
- **Java version**: Jabba environment setup and JAVA_HOME configuration
- **Process exit**: Exit codes with helpful hints for common errors (127, 126, 1)

### 4. API Endpoint Logging (`src/services/serverService.ts`)

Added request/response logging:

- API endpoint calls (start/stop server)
- Success/failure status
- Error details

## What You'll See Now

### On Container Startup:

```
[2025-11-17T10:30:45.123Z] [INFO] ============================================================
[2025-11-17T10:30:45.124Z] [INFO] 🚀 Minecraft Server Manager - Starting up...
[2025-11-17T10:30:45.125Z] [INFO] ============================================================
[2025-11-17T10:30:45.126Z] [INFO] Node Environment: production
[2025-11-17T10:30:45.127Z] [INFO] Platform: linux
[2025-11-17T10:30:45.128Z] [INFO] Architecture: x64
[2025-11-17T10:30:45.129Z] [INFO] Bun Version: 1.1.34
[2025-11-17T10:30:45.130Z] [INFO] Working Directory: /app
[2025-11-17T10:30:45.131Z] [INFO] ✓ Server directory exists: /app/server
[2025-11-17T10:30:45.132Z] [INFO] ✓ Serverfiles directory exists: /app/serverfiles
[2025-11-17T10:30:45.133Z] [INFO] Checking Java installation...
[2025-11-17T10:30:45.234Z] [INFO] ✓ Java is available
[2025-11-17T10:30:45.235Z] [INFO]   Java Version: 24.0.1
[2025-11-17T10:30:45.236Z] [INFO] ============================================================
[2025-11-17T10:30:45.237Z] [INFO] ✓ HTTP Server successfully started!
[2025-11-17T10:30:45.238Z] [INFO]   URL: http://0.0.0.0:3000
[2025-11-17T10:30:45.239Z] [INFO]   Hostname: 0.0.0.0
[2025-11-17T10:30:45.240Z] [INFO]   Port: 3000
```

### When Starting a Minecraft Server:

```
[2025-11-17T10:31:00.123Z] [INFO] API: Start server request for project: my-server
[2025-11-17T10:31:00.124Z] [INFO] [my-server] ========== Starting Server ==========
[2025-11-17T10:31:00.125Z] [INFO] [my-server] Project: my-server
[2025-11-17T10:31:00.126Z] [INFO] [my-server] Server path: /app/server/my-server
[2025-11-17T10:31:00.127Z] [INFO] [my-server] Start script: /app/server/my-server/startserver.sh
[2025-11-17T10:31:00.128Z] [INFO] [my-server] Server path exists: true
[2025-11-17T10:31:00.129Z] [INFO] [my-server] Start script exists: true
[2025-11-17T10:31:00.130Z] [INFO] [my-server] Checking Java availability in: /app/server/my-server
[2025-11-17T10:31:00.231Z] [INFO] [my-server] Java is available (24.0.1)
[2025-11-17T10:31:00.232Z] [INFO] [my-server] Launching server process...
[2025-11-17T10:31:00.233Z] [INFO] [my-server]   Working directory: /app/server/my-server
[2025-11-17T10:31:00.234Z] [INFO] [my-server]   Start file: startserver.sh
[2025-11-17T10:31:00.235Z] [INFO] [my-server]   Platform: linux
[2025-11-17T10:31:00.236Z] [INFO] [my-server] Using system default Java
[2025-11-17T10:31:00.237Z] [INFO] [my-server] Spawning Unix process: bash -c "cd \"/app/server/my-server\" && exec bash ./startserver.sh"
```

### On Server Crash/Error:

```
[2025-11-17T10:32:00.123Z] [INFO] [my-server] Server process exited with code: 127
[2025-11-17T10:32:00.124Z] [ERROR] [my-server] Server crashed or failed with exit code: 127
[2025-11-17T10:32:00.125Z] [ERROR] [my-server] Hint: Command not found - check if startserver.sh exists and is executable
```

## Common Exit Codes

- **0**: Normal shutdown
- **1**: General error (check Java installation and server files)
- **126**: Permission denied (script not executable)
- **127**: Command not found (script doesn't exist or path issue)

## Debugging Tips

1. **Check container logs**: `docker logs <container-name>`
2. **Follow logs in real-time**: `docker logs -f <container-name>`
3. **Look for startup sequence**: Verify all ✓ checkmarks appear
4. **Java availability**: Ensure Java version is detected
5. **Directory permissions**: Check if directories are writable
6. **Server start failures**: Look for exit codes and hints

## Next Steps

If you still have issues after these improvements:

1. Share the complete startup logs
2. Share the server start attempt logs
3. Check if volumes are mounted correctly: `docker inspect <container-name>`
4. Verify file permissions inside container: `docker exec <container-name> ls -la /app/server`
