import { logger } from "@/lib/logger";
import {
  ensureDirectoryExists,
  checkFileExists,
  cleanupPartialFile,
  verifyUploadedFile,
  streamToFile,
} from "../serverFile/serverFileUtils";
import type { ImportResult } from "./modpackImport.types";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB, same cap as the regular upload endpoints

function filenameFromUrl(url: string): string {
  const path = new URL(url).pathname;
  const last = path.substring(path.lastIndexOf("/") + 1);
  return decodeURIComponent(last) || "download.zip";
}

/**
 * Download a file from an arbitrary URL straight to ./serverfiles, streaming
 * to disk exactly like the raw-body stream upload does for a browser upload.
 */
export async function downloadUrlToServerFiles(
  sourceUrl: string,
  filenameOverride?: string
): Promise<ImportResult> {
  let filename: string;
  try {
    filename = (filenameOverride || filenameFromUrl(sourceUrl)).trim();
  } catch {
    return { success: false, error: "Ungültige URL" };
  }

  if (!filename.toLowerCase().endsWith(".zip")) {
    filename = `${filename}.zip`;
  }

  const serverFilesDir = "./serverfiles";
  const filePath = `${serverFilesDir}/${filename}`;

  await ensureDirectoryExists(serverFilesDir);

  if (await checkFileExists(filePath)) {
    return { success: false, error: "Eine Datei mit diesem Namen existiert bereits" };
  }

  logger.info(`Downloading server file from URL: ${sourceUrl} -> ${filePath}`);

  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch (error) {
    return {
      success: false,
      error: `Download fehlgeschlagen: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
    };
  }

  if (!response.ok || !response.body) {
    return { success: false, error: `Download fehlgeschlagen: HTTP ${response.status}` };
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_SIZE) {
    return { success: false, error: "Datei zu groß. Maximum sind 2GB" };
  }

  const writeStream = require("fs").createWriteStream(filePath);

  try {
    const reader = response.body.getReader();
    await streamToFile(reader, writeStream);

    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    const stat = await verifyUploadedFile(filePath, contentLength, filename);

    return {
      success: true,
      message: "Datei erfolgreich importiert",
      filename,
      size: stat.size,
    };
  } catch (error) {
    logger.error("Modpack URL download failed:", error);
    await cleanupPartialFile(writeStream, filePath);

    return {
      success: false,
      error: `Download fehlgeschlagen: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
    };
  }
}
