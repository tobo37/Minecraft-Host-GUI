import { serve } from "bun";
import index from "./index.html";

// Import services
import {
  listServers,
  createServer,
  getServerStatus,
  startServer,
  stopServer,
  getServerLogs,
} from "./services/serverService";
import {
  listServerFiles,
  uploadServerFile,
  uploadServerFileStream,
  deleteServerFile,
} from "./services/serverFileService";
import {
  listConfigFiles,
  readConfigFile,
  saveConfigFile,
} from "./services/configService";
import {
  updateServerMetadata,
  deleteServerInstance,
} from "./services/metadataApiService";
import {
  findStartFiles,
  setStartFile,
} from "./services/startFileService";

const server = serve({
  // Bind to all interfaces for Docker compatibility
  hostname: "0.0.0.0",
  port: 3000,
  // Increase timeout for server creation operations and large file uploads
  idleTimeout: 255, // Maximum allowed timeout (255 seconds)
  // Increase max request size for file uploads (2GB)
  maxRequestBodySize: 2 * 1024 * 1024 * 1024,

  routes: {
    "/api/servers": {
      async GET(req) {
        return await listServers();
      },
    },

    "/api/serverfiles": {
      async GET(req) {
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

console.log(`🚀 Server running at ${server.url}`);
