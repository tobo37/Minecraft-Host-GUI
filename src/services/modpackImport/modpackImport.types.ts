// Type definitions for modpack link import (CurseForge + generic direct URL)

export type ModpackReleaseType = "release" | "beta" | "alpha";

export interface ModpackVersion {
  /** CurseForge file id of the server pack itself — what gets downloaded on import */
  id: number;
  displayName: string;
  gameVersion: string;
  releaseType: ModpackReleaseType;
  fileDate: string;
}

export interface ResolvedModpack {
  platform: "curseforge";
  modId: number;
  name: string;
  versions: ModpackVersion[];
}

export interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  filename?: string;
  size?: number;
  modpackInfo?: {
    name: string;
    version: string;
  };
}
