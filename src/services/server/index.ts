/**
 * Server service public API
 * Re-exports all server-related functionality
 */

// Types
export type { 
  ServerMetadata, 
  ServerInfo, 
  CreateServerData, 
  ServerProcess,
  ServerResult 
} from './server.types';

// Server listing
export { listServers } from './serverList';

// Server creation
export { createServer } from './serverCreate';

// Server lifecycle
export { startServer, killServer, shutdownServer } from './serverLifecycle';

// Repository (for internal use)
export * from './serverRepository';
