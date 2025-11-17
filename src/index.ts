import { serve } from "bun";
import index from "./index.html";
import { logger } from "@/lib/logger";

// Import services
import {
  listServers,
  createServer,
  getServerStatus,
  startServer,
  stopServer,
  getServerLogs,
  sendServerCommand,
  sendRconCommand,
  enableRcon,
  getRconStatus,
} from "./services/serverService";
import {
  listServerFiles,
  uploadServerFile,
  uploadServerFileStream,
  deleteServerFile,
} from "./services/serverFile";
import { listConfigFiles, readConfigFile, saveConfigFile } from "./services/configService";
import { updateServerMetadata, deleteServerInstance } from "./services/metadataApiService";
import { findStartFiles, setStartFile } from "./services/startFileService";
import {
  handleJavaInfo,
  handleJabbaInfo,
  handleJabbaInstall,
  handleJabbaLsRemote,
  handleJabbaInstallVersion,
  handleJabbaUse,
  loadJabbaEnvironment,
} from "./services/javaService";

// Startup logging
logger.info("=".repeat(60));
logger.info("🚀 Minecraft Server Manager - Starting up...");
logger.info("=".repeat(60));
logger.info(`Node Environment: ${process.env.NODE_ENV || "development"}`);
logger.info(`Platform: ${process.platform}`);
logger.info(`Architecture: ${process.arch}`);
logger.info(`Bun Version: ${Bun.version}`);
logger.info(`Working Directory: ${process.cwd()}`);

// Check critical directories
const fs = await import("fs/promises");
const path = await import("path");

const serverDir = path.join(process.cwd(), "server");
const serverFilesDir = path.join(process.cwd(), "serverfiles");

try {
  await fs.access(serverDir);
  logger.info(`✓ Server directory exists: ${serverDir}`);
} catch {
  logger.warn(`⚠ Server directory not found: ${serverDir}`);
  try {
    await fs.mkdir(serverDir, { recursive: true });
    logger.info(`✓ Created server directory: ${serverDir}`);
  } catch (error) {
    logger.error(`✗ Failed to create server directory: ${error}`);
  }
}

try {
  await fs.access(serverFilesDir);
  logger.info(`✓ Serverfiles directory exists: ${serverFilesDir}`);
} catch {
  logger.warn(`⚠ Serverfiles directory not found: ${serverFilesDir}`);
  try {
    await fs.mkdir(serverFilesDir, { recursive: true });
    logger.info(`✓ Created serverfiles directory: ${serverFilesDir}`);
  } catch (error) {
    logger.error(`✗ Failed to create serverfiles directory: ${error}`);
  }
}

// Check Java availability
logger.info("Checking Java installation...");
try {
  const javaCheck = Bun.spawn(["java", "-version"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await javaCheck.exited;
  if (exitCode === 0) {
    logger.info("✓ Java is available");

    // Try to get Java version
    try {
      const stderr = await new Response(javaCheck.stderr).text();
      const versionMatch = stderr.match(/version "([^"]+)"/);
      if (versionMatch) {
        logger.info(`  Java Version: ${versionMatch[1]}`);
      }
    } catch {
      // Ignore version parsing errors
    }
  } else {
    logger.warn(`⚠ Java check failed with exit code: ${exitCode}`);
  }
} catch (error) {
  logger.error(`✗ Java check failed: ${error}`);
}

// Load Jabba environment on startup if available
logger.info("Loading Jabba environment...");
try {
  await loadJabbaEnvironment();
  logger.info("✓ Jabba environment loaded");
} catch (error) {
  logger.warn(`⚠ Jabba environment not available: ${error}`);
}

logger.info("=".repeat(60));
logger.info("Starting HTTP server...");

const server = serve({
  // Bind to all interfaces for Docker compatibility
  hostname: "0.0.0.0",
  port: 3000,
  // Increase timeout for server creation operations and large file uploads
  idleTimeout: 255, // Maximum allowed timeout (255 seconds)
  // Increase max request size for file uploads (2GB)
  maxRequestBodySize: 2 * 1024 * 1024 * 1024,

  routes: {
    "/api/health": {
      async GET(_req) {
        return Response.json({ status: "ok", timestamp: new Date().toISOString() });
      },
    },

    "/api/servers": {
      async GET(_req) {
        return await listServers();
      },
    },

    "/api/serverfiles": {
      async GET(_req) {
        return await listServerFiles();
      },
    },

    "/api/upload-serverfile": {
      async POST(req) {
        return await uploadServerFile(req);
      },
    },

    "/api/upload-serverfile-stream": {
      async POST(req) {
        return await uploadServerFileStream(req);
      },
    },

    "/api/create-server": {
      async POST(req) {
        return await createServer(req);
      },
    },

    "/api/config/list": {
      async GET(req) {
        return await listConfigFiles(req);
      },
    },

    "/api/config/read": {
      async GET(req) {
        return await readConfigFile(req);
      },
    },

    "/api/config/save": {
      async POST(req) {
        return await saveConfigFile(req);
      },
    },

    "/api/server/status": {
      async GET(req) {
        return await getServerStatus(req);
      },
    },

    "/api/server/start": {
      async POST(req) {
        return await startServer(req);
      },
    },

    "/api/server/stop": {
      async POST(req) {
        return await stopServer(req);
      },
    },

    "/api/server/logs": {
      async GET(req) {
        return await getServerLogs(req);
      },
    },

    "/api/server/command": {
      async POST(req) {
        return await sendServerCommand(req);
      },
    },

    "/api/server/rcon": {
      async POST(req) {
        return await sendRconCommand(req);
      },
    },

    "/api/server/rcon/enable": {
      async POST(req) {
        return await enableRcon(req);
      },
    },

    "/api/server/rcon/status": {
      async GET(req) {
        return await getRconStatus(req);
      },
    },

    "/api/delete-serverfile": {
      async DELETE(req) {
        return await deleteServerFile(req);
      },
    },

    "/api/server/metadata": {
      async POST(req) {
        return await updateServerMetadata(req);
      },
    },

    "/api/server/delete": {
      async DELETE(req) {
        return await deleteServerInstance(req);
      },
    },

    "/api/server/find-start-files": {
      async GET(req) {
        return await findStartFiles(req);
      },
    },

    "/api/server/set-start-file": {
      async POST(req) {
        return await setStartFile(req);
      },
    },

    "/api/java/info": {
      async GET(_req) {
        return await handleJavaInfo();
      },
    },

    "/api/java/jabba/info": {
      async GET(_req) {
        return await handleJabbaInfo();
      },
    },

    "/api/java/jabba/install": {
      async POST(_req) {
        return await handleJabbaInstall();
      },
    },

    "/api/java/jabba/ls-remote": {
      async GET(_req) {
        return await handleJabbaLsRemote();
      },
    },

    "/api/java/jabba/install-version": {
      async POST(req) {
        return await handleJabbaInstallVersion(req);
      },
    },

    "/api/java/jabba/use": {
      async POST(req) {
        return await handleJabbaUse(req);
      },
    },

    "/api/server/browse-directory": {
      async GET(req) {
        const { handleBrowseDirectory } = await import("./services/directoryBrowser");
        return await handleBrowseDirectory(req);
      },
    },

    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

logger.info("=".repeat(60));
logger.info(`✓ HTTP Server successfully started!`);
logger.info(`  URL: ${server.url}`);
logger.info(`  Hostname: ${server.hostname}`);
logger.info(`  Port: ${server.port}`);
logger.info("=".repeat(60));
logger.info("Server is ready to accept connections");
logger.info("=".repeat(60));
