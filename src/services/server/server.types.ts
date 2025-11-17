/**
 * Server type definitions
 */

// Type for Bun subprocess - compatible with Bun.spawn return type
export interface ServerProcess {
  kill: () => void;
  killed: boolean;
  exited: Promise<number>;
  stdout: globalThis.ReadableStream<Uint8Array> | null;
  stderr: globalThis.ReadableStream<Uint8Array> | null;
  stdin: unknown;
}

export interface ServerMetadata {
  customName?: string;
  description?: string;
  createdAt: string;
  lastModified?: string;
  sourceZipFile?: string;
  startFile?: string;
  javaVersion?: string;
}

export interface ServerInfo {
  name: string;
  path: string;
  createdAt: string;
  customName?: string;
  description?: string;
  sourceZipFile?: string;
  startFile?: string;
  status?: 'running' | 'stopped' | 'unknown';
  lastModified?: string;
}

export interface CreateServerData {
  serverFile?: string;
  customName?: string;
  description?: string;
}

export interface ServerResult {
  success: boolean;
  message: string;
  serverPath?: string;
  createdAt?: string;
  usedServerFile?: string;
  metadata?: ServerMetadata;
  error?: string;
}
