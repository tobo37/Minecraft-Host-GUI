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
 * Find potential start files in a server directory
 */
export async function findStartFiles(req: Request): Promise<Response> {
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

    const serverPath = `./server/${project}`;
    const fs = require("fs").promises;

    // Check if server directory exists
    try {
      await fs.access(serverPath);
    } catch {
      return Response.json(
        {
          success: false,
          error: "Server directory not found",
        },
        { status: 404 }
      );
    }

    // Recursively search for potential start files
    const candidates: StartFileCandidate[] = [];
    
    async function searchDirectory(dir: string, depth: number = 0) {
      // Limit search depth to avoid performance issues
      if (depth > 3) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = `${dir}/${entry.name}`;
          const relativePath = fullPath.replace(`${serverPath}/`, "");

          // Skip common directories that won't contain start files
          if (entry.isDirectory()) {
            const skipDirs = ["libraries", "mods", "config", "logs", "world", "backups"];
            if (!skipDirs.includes(entry.name.toLowerCase())) {
              await searchDirectory(fullPath, depth + 1);
            }
            continue;
          }

          // Check if file matches start file patterns
          const fileName = entry.name.toLowerCase();
          const isShellScript = fileName.endsWith(".sh");
          const isBatchFile = fileName.endsWith(".bat") || fileName.endsWith(".cmd");
          const isJarFile = fileName.endsWith(".jar");

          if (!isShellScript && !isBatchFile && !isJarFile) continue;

          // Determine confidence level based on filename
          let confidence: "high" | "medium" | "low" = "low";
          
          if (
            fileName.includes("start") ||
            fileName.includes("run") ||
            fileName.includes("launch")
          ) {
            confidence = "high";
          } else if (
            fileName.includes("server") ||
            fileName === "forge.jar" ||
            fileName === "minecraft_server.jar"
          ) {
            confidence = "medium";
          }

          // Get file stats
          const stats = await fs.stat(fullPath);
          
          // Check if file is executable (Unix-like systems)
          let isExecutable = false;
          try {
            await fs.access(fullPath, fs.constants.X_OK);
            isExecutable = true;
          } catch {
            // Not executable or Windows system
            isExecutable = isBatchFile; // Batch files are always "executable" on Windows
          }

          candidates.push({
            path: relativePath,
            name: entry.name,
            size: stats.size,
            isExecutable,
            confidence,
          });
        }
      } catch (error) {
        console.error(`Error searching directory ${dir}:`, error);
      }
    }

    await searchDirectory(serverPath);

    // Sort by confidence and then by name
    candidates.sort((a, b) => {
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      if (confDiff !== 0) return confDiff;
      return a.name.localeCompare(b.name);
    });

    return Response.json({
      success: true,
      candidates,
      count: candidates.length,
    });
  } catch (error) {
    console.error("Error finding start files:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Set the start file for a server
 */
export async function setStartFile(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { project, startFile } = body;

    if (!project || !startFile) {
      return Response.json(
        {
          success: false,
          error: "Project and startFile parameters are required",
        },
        { status: 400 }
      );
    }

    const serverPath = `./server/${project}`;
    const startFilePath = `${serverPath}/${startFile}`;
    const fs = require("fs").promises;

    // Verify the start file exists
    try {
      await fs.access(startFilePath);
    } catch {
      return Response.json(
        {
          success: false,
          error: "Start file not found",
        },
        { status: 404 }
      );
    }

    // Update metadata with the new start file
    const { writeMetadata, readMetadata } = await import("./metadataService");
    const metadata = await readMetadata(project);

    if (!metadata) {
      return Response.json(
        {
          success: false,
          error: "Server metadata not found",
        },
        { status: 404 }
      );
    }

    // Update metadata
    metadata.startFile = startFile;
    metadata.lastModified = new Date().toISOString();
    await writeMetadata(project, metadata);

    return Response.json({
      success: true,
      message: "Start file updated successfully",
      startFile,
    });
  } catch (error) {
    console.error("Error setting start file:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
