// Type definitions for the Minecraft server manager

export interface Server {
  name: string;
  path: string;
  createdAt: string;
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

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface ServerStatus {
  status: 'running' | 'stopped';
}

export interface ServerLogs {
  logs: string[];
}