/**
 * Service for finding and managing server start files
 */

export interface StartFileCandidate {
  path: string;
  name: string;
  size: number;
  isExecutable: boolean;
  confidence: "high" | "medium" | "low";
}

/**
 * Validate server path and return actual path (including projectPath if set)
 */
async function validateServerPath(project: string | null): Promise<string> {
  if (!project) {
    throw new Error("Project parameter is required");
  }

  const { readMetadata } = await import("./metadataService");
  const { getActualServerPath } = await import("./server/serverRepository");
  const fs = require("fs").promises;

  const metadata = await readMetadata(project);
  const serverPath = getActualServerPath(project, metadata?.projectPath);

  try {
    await fs.access(serverPath);
  } catch {
    throw new Error("Server directory not found");
  }

  return serverPath;
}

/**
 * Scan server directory recursively for start file candidates
 */
async function scanServerDirectory(
  serverPath: string
): Promise<StartFileCandidate[]> {
  const candidates: StartFileCandidate[] = [];
  await searchDirectory(serverPath, serverPath, candidates, 0);
  return candidates;
}

/**
 * Filter and sort start file candidates
 */
function filterStartFiles(
  candidates: StartFileCandidate[]
): StartFileCandidate[] {
  // Sort by confidence and then by name
  return candidates.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff =
      confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Find potential start files in a server directory
 */
export async function findStartFiles(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get("project");

    const serverPath = await validateServerPath(project);
    const candidates = await scanServerDirectory(serverPath);
    const sortedCandidates = filterStartFiles(candidates);

    return Response.json({
      success: true,
      candidates: sortedCandidates,
      count: sortedCandidates.length,
    });
  } catch (error) {
    console.error("Error finding start files:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const status = errorMessage.includes("required")
      ? 400
      : errorMessage.includes("not found")
      ? 404
      : 500;

    return Response.json(
      {
        success: false,
        error: errorMessage,
      },
      { status }
    );
  }
}

/**
 * Determine confidence level based on filename
 */
function determineConfidence(fileName: string): "high" | "medium" | "low" {
  if (
    fileName.includes("start") ||
    fileName.includes("run") ||
    fileName.includes("launch")
  ) {
    return "high";
  }

  if (
    fileName.includes("server") ||
    fileName === "forge.jar" ||
    fileName === "minecraft_server.jar"
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Check if file is executable
 */
async function checkExecutable(
  fullPath: string,
  isBatchFile: boolean
): Promise<boolean> {
  const fs = require("fs").promises;

  try {
    await fs.access(fullPath, fs.constants.X_OK);
    return true;
  } catch {
    // Not executable or Windows system
    return isBatchFile; // Batch files are always "executable" on Windows
  }
}

/**
 * Check if file matches start file patterns
 */
function isStartFileCandidate(fileName: string): boolean {
  const isShellScript = fileName.endsWith(".sh");
  const isBatchFile = fileName.endsWith(".bat") || fileName.endsWith(".cmd");
  const isJarFile = fileName.endsWith(".jar");

  return isShellScript || isBatchFile || isJarFile;
}

interface FileEntry {
  name: string;
  isDirectory: () => boolean;
}

/**
 * Process a file entry and add to candidates if it matches criteria
 */
async function processFileEntry(
  entry: FileEntry,
  fullPath: string,
  relativePath: string,
  candidates: StartFileCandidate[]
): Promise<void> {
  const fileName = entry.name.toLowerCase();

  if (!isStartFileCandidate(fileName)) return;

  const fs = require("fs").promises;
  const stats = await fs.stat(fullPath);
  const confidence = determineConfidence(fileName);
  const isBatchFile = fileName.endsWith(".bat") || fileName.endsWith(".cmd");
  const isExecutable = await checkExecutable(fullPath, isBatchFile);

  candidates.push({
    path: relativePath,
    name: entry.name,
    size: stats.size,
    isExecutable,
    confidence,
  });
}

/**
 * Check if directory should be skipped
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = ["libraries", "mods", "config", "logs", "world", "backups"];
  return skipDirs.includes(dirName.toLowerCase());
}

interface ProcessEntryParams {
  entry: FileEntry;
  dir: string;
  serverPath: string;
  candidates: StartFileCandidate[];
  depth: number;
}

/**
 * Process a single directory entry
 */
async function processEntry(params: ProcessEntryParams): Promise<void> {
  const { entry, dir, serverPath, candidates, depth } = params;
  const fullPath = `${dir}/${entry.name}`;
  const relativePath = fullPath.replace(`${serverPath}/`, "");

  if (entry.isDirectory()) {
    if (!shouldSkipDirectory(entry.name)) {
      await searchDirectory(fullPath, serverPath, candidates, depth + 1);
    }
    return;
  }

  await processFileEntry(entry, fullPath, relativePath, candidates);
}

/**
 * Recursively search directory for start files
 */
async function searchDirectory(
  dir: string,
  serverPath: string,
  candidates: StartFileCandidate[],
  depth: number = 0
): Promise<void> {
  // Limit search depth to avoid performance issues
  if (depth > 3) return;

  const fs = require("fs").promises;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      await processEntry({ entry, dir, serverPath, candidates, depth });
    }
  } catch (error) {
    console.error(`Error searching directory ${dir}:`, error);
  }
}

/**
 * Validate start file parameters and file existence
 */
async function validateStartFile(
  project: string | undefined,
  startFile: string | undefined
): Promise<void> {
  if (!project || !startFile) {
    throw new Error("Project and startFile parameters are required");
  }

  const { readMetadata } = await import("./metadataService");
  const { getActualServerPath } = await import("./server/serverRepository");
  const fs = require("fs").promises;

  const metadata = await readMetadata(project);
  const serverPath = getActualServerPath(project, metadata?.projectPath);
  const startFilePath = `${serverPath}/${startFile}`;

  try {
    await fs.access(startFilePath);
  } catch {
    throw new Error("Start file not found");
  }
}

/**
 * Make start file executable if it's a shell script (Unix/Linux only)
 */
async function makeStartFileExecutable(
  serverPath: string,
  startFile: string
): Promise<void> {
  // Only on Unix/Linux systems
  if (process.platform === "win32") return;

  // Only for shell scripts
  if (!startFile.endsWith(".sh")) return;

  const { logger } = await import("@/lib/logger");
  const startFilePath = `${serverPath}/${startFile}`;

  try {
    logger.info(`Making start file executable: ${startFile}`);
    const result = await Bun.spawn(["chmod", "+x", startFilePath]).exited;

    if (result === 0) {
      logger.info(`✓ Successfully made ${startFile} executable`);
    } else {
      logger.warn(
        `Failed to make ${startFile} executable (exit code: ${result})`
      );
    }
  } catch (error) {
    logger.warn(`Failed to chmod ${startFile}: ${error}`);
  }
}

/**
 * Update server metadata with new start file
 */
async function updateMetadata(
  project: string,
  startFile: string,
  serverPath: string
): Promise<void> {
  const { writeMetadata, readMetadata } = await import("./metadataService");
  const metadata = await readMetadata(project);

  if (!metadata) {
    throw new Error("Server metadata not found");
  }

  // Make the start file executable if it's a .sh file
  await makeStartFileExecutable(serverPath, startFile);

  metadata.startFile = startFile;
  metadata.lastModified = new Date().toISOString();
  await writeMetadata(project, metadata);
}

/**
 * Set the start file for a server
 */
export async function setStartFile(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { project, startFile } = body;

    await validateStartFile(project, startFile);

    // Get server path for chmod
    const { readMetadata } = await import("./metadataService");
    const { getActualServerPath } = await import("./server/serverRepository");
    const metadata = await readMetadata(project);
    const serverPath = getActualServerPath(project, metadata?.projectPath);

    await updateMetadata(project, startFile, serverPath);

    return Response.json({
      success: true,
      message: "Start file updated successfully",
      startFile,
    });
  } catch (error) {
    console.error("Error setting start file:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const status = errorMessage.includes("required")
      ? 400
      : errorMessage.includes("not found")
      ? 404
      : 500;

    return Response.json(
      {
        success: false,
        error: errorMessage,
      },
      { status }
    );
  }
}
