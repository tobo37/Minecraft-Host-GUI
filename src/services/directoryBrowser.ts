/**
 * Directory browser service for exploring server folder structure
 */

import { promises as fs } from "fs";
import path from "path";

export interface DirectoryNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  hasServerFiles?: boolean;
  serverFiles?: string[];
  children?: DirectoryNode[];
}

/**
 * Check if a path should be excluded from browsing
 */
function shouldExclude(name: string): boolean {
  const excludePatterns = [
    ".git",
    "node_modules",
    ".metadata.json",
    ".created",
    ".gitkeep",
    "world",
    "logs",
    "crash-reports",
    "backups",
  ];

  return excludePatterns.includes(name) || name.startsWith(".");
}

/**
 * Check if directory contains server files (startserver.sh, server.properties, etc.)
 */
async function hasServerFiles(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    const serverFileIndicators = [
      "startserver.sh",
      "startserver.bat",
      "start.sh",
      "start.bat",
      "server.properties",
      "eula.txt",
    ];

    return entries.some((entry) => serverFileIndicators.includes(entry));
  } catch {
    return false;
  }
}

/**
 * Find server files in directory
 */
async function findServerFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath);
    const serverFileIndicators = [
      "startserver.sh",
      "startserver.bat",
      "start.sh",
      "start.bat",
      "server.properties",
      "eula.txt",
    ];

    return entries.filter((entry) => serverFileIndicators.includes(entry));
  } catch {
    return [];
  }
}

/**
 * Build directory tree recursively
 */
async function buildDirectoryTree(
  dirPath: string,
  basePath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<DirectoryNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: DirectoryNode[] = [];

    for (const entry of entries) {
      if (shouldExclude(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        const serverFiles = await findServerFiles(fullPath);
        const hasFiles = serverFiles.length > 0;
        const children = await buildDirectoryTree(fullPath, basePath, maxDepth, currentDepth + 1);

        nodes.push({
          name: entry.name,
          path: fullPath,
          relativePath: relativePath.replace(/\\/g, "/"),
          isDirectory: true,
          hasServerFiles: hasFiles,
          serverFiles: hasFiles ? serverFiles : undefined,
          children,
        });
      }
    }

    // Sort directories alphabetically
    nodes.sort((a, b) => a.name.localeCompare(b.name));

    return nodes;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

/**
 * Browse server directory structure
 */
export async function browseServerDirectory(project: string): Promise<DirectoryNode[]> {
  const serverPath = path.join("./server", project);

  try {
    await fs.access(serverPath);
  } catch {
    throw new Error("Server directory not found");
  }

  return await buildDirectoryTree(serverPath, serverPath, 3);
}

/**
 * API handler for browsing directory
 */
export async function handleBrowseDirectory(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const project = url.searchParams.get("project");

    if (!project) {
      return Response.json(
        {
          success: false,
          error: "Project parameter is required",
        },
        { status: 400 }
      );
    }

    // Security check
    if (project.includes("..") || project.includes("/") || project.includes("\\")) {
      return Response.json(
        {
          success: false,
          error: "Invalid project path",
        },
        { status: 403 }
      );
    }

    const tree = await browseServerDirectory(project);

    return Response.json({
      success: true,
      tree,
    });
  } catch (error) {
    console.error("Error browsing directory:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
