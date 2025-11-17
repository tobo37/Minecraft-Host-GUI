/**
 * Server listing functionality
 */

import type { ServerInfo } from './server.types';
import { readMetadata, migrateMetadata } from '../metadataService';
import { 
  readServerDirectory, 
  isDirectory, 
  getServerBasePath,
  getServerPath 
} from './serverRepository';

// Import from main service for now (will be refactored)
import { runningServers } from '../serverService';

/**
 * Get server status
 */
function getServerStatus(serverName: string): 'running' | 'stopped' {
  const serverProcess = runningServers.get(serverName);
  return serverProcess && !serverProcess.killed ? 'running' : 'stopped';
}

/**
 * Build server info from metadata
 */
async function buildServerInfo(
  entry: string,
  metadata: { customName?: string; createdAt: string; lastModified?: string; description?: string; sourceZipFile?: string; startFile?: string } | null
): Promise<ServerInfo> {
  if (!metadata) {
    return {
      name: entry,
      path: entry,
      createdAt: entry,
      status: getServerStatus(entry),
    };
  }

  return {
    name: metadata.customName || entry,
    path: entry,
    createdAt: metadata.createdAt,
    customName: metadata.customName,
    description: metadata.description,
    sourceZipFile: metadata.sourceZipFile,
    startFile: metadata.startFile,
    status: getServerStatus(entry),
    lastModified: metadata.lastModified,
  };
}

/**
 * List all servers with their metadata
 */
export async function listServers(): Promise<ServerInfo[]> {
  const serverDir = getServerBasePath();
  const entries = await readServerDirectory(serverDir);
  const servers: ServerInfo[] = [];

  for (const entry of entries) {
    if (entry === '.gitkeep') continue;

    const serverPath = getServerPath(entry);
    const isDir = await isDirectory(serverPath);
    if (!isDir) continue;

    let metadata = await readMetadata(entry);
    
    // Migrate metadata if missing
    if (!metadata) {
      try {
        metadata = await migrateMetadata(entry);
      } catch {
        // Use fallback data if migration fails
        metadata = null;
      }
    }

    const serverInfo = await buildServerInfo(entry, metadata);
    servers.push(serverInfo);
  }

  // Sort by last modified date (newest first)
  servers.sort((a, b) => {
    const dateA = new Date(a.lastModified || a.createdAt).getTime();
    const dateB = new Date(b.lastModified || b.createdAt).getTime();
    return dateB - dateA;
  });

  return servers;
}
