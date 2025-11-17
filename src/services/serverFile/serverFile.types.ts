// Type definitions for server file operations

export interface ServerFile {
  name: string;
  size: number;
  uploadedAt: string;
}

export interface UploadResult {
  success: boolean;
  message?: string;
  error?: string;
  filename?: string;
  size?: number;
  completed?: boolean;
  progress?: number;
}

export interface UploadChunk {
  index: number;
  data: ArrayBuffer;
  total: number;
}
