import { logger } from "@/lib/logger";
import { downloadUrlToServerFiles } from "./downloadToServerFiles";
import {
  isCurseForgeModpackUrl,
  resolveModpackFromUrl,
  resolveServerPackDownload,
  CurseForgeConfigError,
  CurseForgeNotFoundError,
} from "./curseforgeClient";

export type { ModpackVersion, ResolvedModpack, ImportResult } from "./modpackImport.types";

/**
 * POST /api/import-serverfile-url
 * Generic import: downloads any direct URL into ./serverfiles, same as a ZIP upload.
 */
export async function importServerFileFromUrl(req: Request): Promise<Response> {
  try {
    const { url, filename } = (await req.json()) as { url?: string; filename?: string };

    if (!url) {
      return Response.json({ success: false, error: "URL fehlt" }, { status: 400 });
    }

    const result = await downloadUrlToServerFiles(url, filename);
    return Response.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    logger.error("Error in importServerFileFromUrl:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/modpack/resolve
 * Recognizes a CurseForge modpack link and lists selectable server-pack versions.
 * Returns `recognized: false` for anything else so the frontend can fall back
 * to a plain direct-URL import without treating it as an error.
 */
export async function resolveModpack(req: Request): Promise<Response> {
  try {
    const { url } = (await req.json()) as { url?: string };

    if (!url) {
      return Response.json({ success: false, error: "URL fehlt" }, { status: 400 });
    }

    if (!isCurseForgeModpackUrl(url)) {
      return Response.json({ success: false, recognized: false });
    }

    const resolved = await resolveModpackFromUrl(url);

    if (resolved.versions.length === 0) {
      return Response.json({
        success: false,
        recognized: true,
        error:
          "Für dieses Modpack wurde kein separates Server Pack gefunden. Bitte den Server manuell als ZIP hochladen.",
      });
    }

    return Response.json({ success: true, recognized: true, ...resolved });
  } catch (error) {
    logger.error("Error in resolveModpack:", error);
    const status = error instanceof CurseForgeNotFoundError ? 404 : 400;
    const message =
      error instanceof CurseForgeConfigError || error instanceof CurseForgeNotFoundError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unbekannter Fehler";

    return Response.json({ success: false, recognized: true, error: message }, { status });
  }
}

/**
 * POST /api/modpack/import
 * Resolves the real download URL for a chosen CurseForge server-pack version
 * and streams it into ./serverfiles.
 */
export async function importModpackFile(req: Request): Promise<Response> {
  try {
    const { modId, fileId, modpackName, versionLabel } = (await req.json()) as {
      modId?: number;
      fileId?: number;
      modpackName?: string;
      versionLabel?: string;
    };

    if (!modId || !fileId) {
      return Response.json({ success: false, error: "modId/fileId fehlt" }, { status: 400 });
    }

    const { downloadUrl, fileName } = await resolveServerPackDownload(modId, fileId);
    const result = await downloadUrlToServerFiles(downloadUrl, fileName);

    if (result.success && modpackName) {
      result.modpackInfo = { name: modpackName, version: versionLabel || "" };
    }

    return Response.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    logger.error("Error in importModpackFile:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
}
