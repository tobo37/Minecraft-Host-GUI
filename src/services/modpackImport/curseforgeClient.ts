import { logger } from "@/lib/logger";
import type { ModpackReleaseType, ModpackVersion, ResolvedModpack } from "./modpackImport.types";

const API_BASE = "https://api.curseforge.com";
const MINECRAFT_GAME_ID = 432;
const MODPACK_CLASS_ID = 4471;

const RELEASE_TYPE_MAP: Record<number, ModpackReleaseType> = {
  1: "release",
  2: "beta",
  3: "alpha",
};

interface CurseForgeFile {
  id: number;
  fileName: string;
  displayName: string;
  releaseType: number;
  fileDate: string;
  gameVersions: string[];
  serverPackFileId?: number | null;
  downloadUrl: string | null;
  isAvailable: boolean;
}

export class CurseForgeConfigError extends Error {}
export class CurseForgeNotFoundError extends Error {}

function getApiKey(): string {
  const key = process.env.CURSEFORGE_API_KEY;
  if (!key) {
    throw new CurseForgeConfigError(
      "CurseForge-Import ist nicht konfiguriert (CURSEFORGE_API_KEY fehlt)"
    );
  }
  return key;
}

async function curseforgeFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "x-api-key": getApiKey(), Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`CurseForge API Fehler (${response.status}) bei ${path}`);
  }

  return (await response.json()) as T;
}

/** Recognizes a CurseForge modpack project URL, e.g. curseforge.com/minecraft/modpacks/<slug> */
export function isCurseForgeModpackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)curseforge\.com$/.test(parsed.hostname) &&
      /\/minecraft\/modpacks\/[^/]+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function extractSlug(url: string): string {
  const match = new URL(url).pathname.match(/\/minecraft\/modpacks\/([^/]+)/);
  const slug = match?.[1];
  if (!slug) {
    throw new Error("Konnte den Modpack-Slug nicht aus der URL lesen");
  }
  return slug;
}

/**
 * Resolves a CurseForge modpack project link and lists only the versions that
 * ship a dedicated, ready-to-run server pack (CurseForge's `serverPackFileId`).
 */
export async function resolveModpackFromUrl(url: string): Promise<ResolvedModpack> {
  const slug = extractSlug(url);

  const searchResult = await curseforgeFetch<{
    data: Array<{ id: number; name: string; slug: string }>;
  }>(`/v1/mods/search?gameId=${MINECRAFT_GAME_ID}&classId=${MODPACK_CLASS_ID}&slug=${encodeURIComponent(slug)}`);

  const mod = searchResult.data.find((m) => m.slug === slug) ?? searchResult.data[0];
  if (!mod) {
    throw new CurseForgeNotFoundError(`Kein CurseForge-Modpack mit Slug "${slug}" gefunden`);
  }

  const versions = await listServerPackVersions(mod.id);

  return { platform: "curseforge", modId: mod.id, name: mod.name, versions };
}

async function listServerPackVersions(modId: number): Promise<ModpackVersion[]> {
  const filesResult = await curseforgeFetch<{ data: CurseForgeFile[] }>(
    `/v1/mods/${modId}/files?pageSize=50`
  );

  return filesResult.data
    .filter((file) => file.isAvailable && file.serverPackFileId)
    .map((file) => ({
      id: file.serverPackFileId as number,
      displayName: file.displayName || file.fileName,
      gameVersion: file.gameVersions.find((v) => /^\d/.test(v)) || file.gameVersions[0] || "?",
      releaseType: RELEASE_TYPE_MAP[file.releaseType] || "release",
      fileDate: file.fileDate,
    }))
    .sort((a, b) => new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime());
}

/** Resolves the actual download URL for a chosen server pack file. */
export async function resolveServerPackDownload(
  modId: number,
  serverPackFileId: number
): Promise<{ downloadUrl: string; fileName: string }> {
  const fileResult = await curseforgeFetch<{ data: CurseForgeFile }>(
    `/v1/mods/${modId}/files/${serverPackFileId}`
  );

  if (!fileResult.data.downloadUrl) {
    logger.warn(`CurseForge file ${serverPackFileId} has no downloadUrl (author disabled distribution)`);
    throw new Error(
      "Der Autor hat den Download dieses Server Packs über die API deaktiviert. Bitte manuell laden und als ZIP hochladen."
    );
  }

  return { downloadUrl: fileResult.data.downloadUrl, fileName: fileResult.data.fileName };
}
