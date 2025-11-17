// Type definitions for the Minecraft server manager

export interface ServerMetadata {
  customName: string;
  description: string;
  createdAt: string;
  lastModified: string;
  sourceZipFile: string;
  startFile?: string; // Custom start file path (e.g., "startserver.sh" or "start.bat")
  projectPath?: string; // Relative path to actual server folder (e.g., "BM_Revelations_II-2.2.2_server")
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

export interface Server {
  name: string;
  path: string;
  createdAt: string;
  customName?: string;
  description?: string;
  sourceZipFile?: string;
  startFile?: string;
  projectPath?: string;
  status?: "running" | "stopped";
  lastModified?: string;
}

export interface ServerFile {
  name: string;
  size: number;
  uploadedAt: string;
}

export interface ConfigFile {
  name: string;
  path: string;
  description: string;
  category: string;
  exists: boolean;
  enabled: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export type ServerStatus = "stopped" | "starting" | "running" | "stopping";

export interface ServerStatusResponse {
  status: ServerStatus;
}

export interface ServerLogs {
  logs: string[];
}
