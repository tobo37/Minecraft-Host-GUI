/**
 * Server type definitions
 */

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

export interface ServerProcess {
  kill: () => void;
  killed: boolean;
  exited: Promise<number>;
  stdout: unknown;
  stderr: unknown;
  stdin: unknown;
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
