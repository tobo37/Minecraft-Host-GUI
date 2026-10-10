import { promises as fs, createWriteStream } from "fs";
import path from "path";
import { logger } from "@/lib/logger";
import { readMetadata } from "./metadataService";
import {
  getServerBasePath,
  getServerRuntimePath,
  isPathInside,
} from "./server/serverRepository";
import { cleanupPartialFile, streamToFile } from "./serverFile/serverFileUtils";

/**
 * File manager for a single server instance.
 * Every path coming from the client is relative to the server's runtime
 * directory (where mods/, config/, server.properties live) and is checked
 * so it can never escape that directory.
 */

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024; // 2GB, same cap as server file uploads
const MAX_EDITABLE_SIZE = 5 * 1024 * 1024; // Text editor limit

/** Vanilla files that must stay strict JSON or the server ignores them */
const STRICT_JSON_FILES = [
  "ops.json",
  "whitelist.json",
  "banned-players.json",
  "banned-ips.json",
  "usercache.json",
];

/**
 * Validate content of vanilla JSON files before it is written.
 * Returns an error message, or null when the content is fine.
 */
export function validateServerJson(fileName: string, content: string): string | null {
  const baseName = path.basename(fileName);
  if (!STRICT_JSON_FILES.includes(baseName.toLowerCase())) return null;

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? null : `${baseName} must contain a JSON array ([ ... ])`;
  } catch (error) {
    return `Invalid JSON in ${baseName}: ${error instanceof Error ? error.message : "parse error"}`;
  }
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
}

export class FileManagerError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function jsonError(error: unknown, fallbackMessage: string): Response {
  if (error instanceof FileManagerError) {
    return Response.json({ success: false, error: error.message }, { status: error.status });
  }
  logger.error(`${fallbackMessage}:`, error);
  return Response.json(
    { success: false, error: error instanceof Error ? error.message : fallbackMessage },
    { status: 500 }
  );
}

/**
 * Resolve the root directory the file manager operates in for a project
 */
export async function resolveRoot(project: string | null | undefined): Promise<string> {
  if (!project) {
    throw new FileManagerError("Project parameter is required", 400);
  }

  const metadata = await readMetadata(project);
  const root = getServerRuntimePath(project, metadata?.projectPath, metadata?.startFile);

  if (!isPathInside(getServerBasePath(), root)) {
    throw new FileManagerError("Access denied", 403);
  }

  try {
    await fs.access(root);
  } catch {
    throw new FileManagerError("Server directory not found", 404);
  }

  return path.resolve(root);
}

/**
 * Resolve a client-supplied relative path inside the root ("" = root itself)
 */
function resolveInside(root: string, relativePath: string | null | undefined): string {
  const normalized = (relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const target = path.resolve(root, normalized);

  if (target !== root && !isPathInside(root, target)) {
    throw new FileManagerError("Access denied", 403);
  }

  return target;
}

function toRelative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join("/");
}

/**
 * Validate a single file or folder name (no separators, no traversal)
 */
function validateName(name: string | null | undefined): string {
  const trimmed = (name || "").trim();

  if (!trimmed || trimmed === "." || trimmed === ".." || /[\\/:*?"<>|\0]/.test(trimmed)) {
    throw new FileManagerError("Invalid file name", 400);
  }

  return trimmed;
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function requireDirectory(target: string): Promise<void> {
  try {
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) throw new FileManagerError("Not a directory", 400);
  } catch (error) {
    if (error instanceof FileManagerError) throw error;
    throw new FileManagerError("Directory not found", 404);
  }
}

/**
 * Write a web stream to disk via a temp file, so an aborted transfer never
 * clobbers an existing file; removes the partial file on failure
 */
async function writeStreamToDisk(
  body: ReadableStream<Uint8Array>,
  filePath: string
): Promise<number> {
  const tempPath = `${filePath}.${Date.now()}.part`;
  const writeStream = createWriteStream(tempPath);

  try {
    await streamToFile(body.getReader(), writeStream);
    writeStream.end();
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });
    await fs.rename(tempPath, filePath);
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch (error) {
    await cleanupPartialFile(writeStream, tempPath);
    throw error;
  }
}

/**
 * GET /api/files/list?project=&path=
 */
export async function listFiles(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const root = await resolveRoot(url.searchParams.get("project"));
    const dir = resolveInside(root, url.searchParams.get("path"));
    await requireDirectory(dir);

    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const entries: FileEntry[] = [];

    for (const dirent of dirents) {
      const fullPath = path.join(dir, dirent.name);
      try {
        const stat = await fs.stat(fullPath);
        entries.push({
          name: dirent.name,
          path: toRelative(root, fullPath),
          type: stat.isDirectory() ? "directory" : "file",
          size: stat.isDirectory() ? 0 : stat.size,
          modified: stat.mtime.toISOString(),
        });
      } catch {
        // Broken symlinks etc. are skipped
      }
    }

    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    return Response.json({ success: true, path: toRelative(root, dir), entries });
  } catch (error) {
    return jsonError(error, "Failed to list files");
  }
}

/**
 * GET /api/files/read?project=&path=
 * Returns text content for the editor; binary files are rejected.
 */
export async function readFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const root = await resolveRoot(url.searchParams.get("project"));
    const filePath = resolveInside(root, url.searchParams.get("path"));

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) throw new FileManagerError("File not found", 404);
    if (stat.size > MAX_EDITABLE_SIZE) {
      throw new FileManagerError("File too large for the editor (max 5MB)", 413);
    }

    const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer());
    if (buffer.subarray(0, 8000).includes(0)) {
      throw new FileManagerError("Binary files cannot be edited", 415);
    }

    return Response.json({ success: true, content: buffer.toString("utf8") });
  } catch (error) {
    return jsonError(error, "Failed to read file");
  }
}

/**
 * POST /api/files/save { project, path, content }
 */
export async function saveFile(req: Request): Promise<Response> {
  try {
    const { project, path: relativePath, content } = (await req.json()) as {
      project?: string;
      path?: string;
      content?: string;
    };

    if (typeof content !== "string") {
      throw new FileManagerError("Content is required", 400);
    }

    const root = await resolveRoot(project);
    const filePath = resolveInside(root, relativePath);
    if (filePath === root) throw new FileManagerError("Invalid path", 400);

    const stat = await fs.stat(filePath).catch(() => null);
    if (stat?.isDirectory()) throw new FileManagerError("Path is a directory", 400);

    const jsonProblem = validateServerJson(filePath, content);
    if (jsonProblem) throw new FileManagerError(jsonProblem, 400);

    await Bun.write(filePath, content);
    logger.info(`File saved: ${filePath}`);

    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to save file");
  }
}

/**
 * GET /api/files/download?project=&path=
 * Sends the raw file to the browser (e.g. to edit a mod jar locally).
 */
export async function downloadFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const root = await resolveRoot(url.searchParams.get("project"));
    const filePath = resolveInside(root, url.searchParams.get("path"));

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) throw new FileManagerError("File not found", 404);

    const fileName = path.basename(filePath);
    return new Response(Bun.file(filePath), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    return jsonError(error, "Failed to download file");
  }
}

/**
 * POST /api/files/upload?project=&path=&fileName=&overwrite=
 * Raw body stream upload into the given directory.
 */
export async function uploadFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const root = await resolveRoot(url.searchParams.get("project"));
    const dir = resolveInside(root, url.searchParams.get("path"));
    await requireDirectory(dir);

    const fileName = validateName(url.searchParams.get("fileName"));
    const overwrite = url.searchParams.get("overwrite") === "true";
    const fileSize = Number(req.headers.get("content-length") || "0");

    if (fileSize > MAX_UPLOAD_SIZE) {
      throw new FileManagerError("File too large. Maximum size is 2GB", 413);
    }

    const filePath = path.join(dir, fileName);
    if (!overwrite && (await exists(filePath))) {
      throw new FileManagerError("A file with this name already exists", 409);
    }
    if (!req.body) throw new FileManagerError("No request body", 400);

    const size = await writeStreamToDisk(req.body, filePath);
    logger.info(`File uploaded: ${filePath} (${size} bytes)`);

    return Response.json({ success: true, path: toRelative(root, filePath), size });
  } catch (error) {
    return jsonError(error, "Failed to upload file");
  }
}

function fileNameFromResponse(response: Response, sourceUrl: string): string {
  const disposition = response.headers.get("content-disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) return decodeURIComponent(encoded[1]);
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  if (plain?.[1]) return plain[1];

  // Use the final URL after redirects (CDN links usually end in the real file name)
  const finalPath = new URL(response.url || sourceUrl).pathname;
  return decodeURIComponent(finalPath.substring(finalPath.lastIndexOf("/") + 1));
}

/**
 * POST /api/files/download-url { project, path, url, fileName?, overwrite? }
 * Downloads a file from a direct link into the given directory (e.g. a mod jar).
 */
export async function downloadFromUrl(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      project?: string;
      path?: string;
      url?: string;
      fileName?: string;
      overwrite?: boolean;
    };

    const root = await resolveRoot(body.project);
    const dir = resolveInside(root, body.path);
    await requireDirectory(dir);

    let sourceUrl: URL;
    try {
      sourceUrl = new URL(body.url || "");
    } catch {
      throw new FileManagerError("Invalid URL", 400);
    }
    if (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") {
      throw new FileManagerError("Only http(s) links are supported", 400);
    }

    logger.info(`Downloading ${sourceUrl.href} into ${dir}`);

    let response: Response;
    try {
      response = await fetch(sourceUrl.href, { redirect: "follow" });
    } catch (error) {
      throw new FileManagerError(
        `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        502
      );
    }

    if (!response.ok || !response.body) {
      throw new FileManagerError(`Download failed: HTTP ${response.status}`, 502);
    }

    const contentLength = Number(response.headers.get("content-length") || "0");
    if (contentLength > MAX_UPLOAD_SIZE) {
      throw new FileManagerError("File too large. Maximum size is 2GB", 413);
    }

    const fileName = validateName(body.fileName || fileNameFromResponse(response, sourceUrl.href));
    const filePath = path.join(dir, fileName);

    if (!body.overwrite && (await exists(filePath))) {
      await response.body.cancel();
      throw new FileManagerError("A file with this name already exists", 409);
    }

    const size = await writeStreamToDisk(response.body, filePath);
    logger.info(`File downloaded: ${filePath} (${size} bytes)`);

    return Response.json({ success: true, path: toRelative(root, filePath), fileName, size });
  } catch (error) {
    return jsonError(error, "Failed to download file from URL");
  }
}

/**
 * DELETE /api/files/delete?project=&path=
 * Deletes a file or a directory (recursively). The root itself cannot be deleted.
 */
export async function deleteFile(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const root = await resolveRoot(url.searchParams.get("project"));
    const target = resolveInside(root, url.searchParams.get("path"));

    if (target === root) throw new FileManagerError("The server root cannot be deleted", 400);
    if (!(await exists(target))) throw new FileManagerError("File not found", 404);

    await fs.rm(target, { recursive: true, force: true });
    logger.info(`Deleted: ${target}`);

    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to delete file");
  }
}

/**
 * POST /api/files/rename { project, path, newName }
 * Renames within the same directory (also used to toggle mods via ".disabled").
 */
export async function renameFile(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { project?: string; path?: string; newName?: string };
    const root = await resolveRoot(body.project);
    const source = resolveInside(root, body.path);

    if (source === root) throw new FileManagerError("The server root cannot be renamed", 400);
    if (!(await exists(source))) throw new FileManagerError("File not found", 404);

    const target = path.join(path.dirname(source), validateName(body.newName));
    if (await exists(target)) {
      throw new FileManagerError("A file with this name already exists", 409);
    }

    await fs.rename(source, target);
    logger.info(`Renamed: ${source} -> ${target}`);

    return Response.json({ success: true, path: toRelative(root, target) });
  } catch (error) {
    return jsonError(error, "Failed to rename file");
  }
}

/**
 * POST /api/files/mkdir { project, path, name }
 */
export async function createFolder(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { project?: string; path?: string; name?: string };
    const root = await resolveRoot(body.project);
    const parent = resolveInside(root, body.path);
    await requireDirectory(parent);

    const target = path.join(parent, validateName(body.name));
    if (await exists(target)) {
      throw new FileManagerError("A file with this name already exists", 409);
    }

    await fs.mkdir(target);
    return Response.json({ success: true, path: toRelative(root, target) });
  } catch (error) {
    return jsonError(error, "Failed to create folder");
  }
}
