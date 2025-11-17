/**
 * Client-side service for start file operations
 */

export interface StartFileCandidate {
  path: string;
  name: string;
  size: number;
  isExecutable: boolean;
  confidence: "high" | "medium" | "low";
}

interface FindStartFilesResponse {
  success: boolean;
  candidates?: StartFileCandidate[];
  error?: string;
}

interface SetStartFileResponse {
  success: boolean;
  message?: string;
  startFile?: string;
  error?: string;
}

/**
 * Find potential start files for a server
 */
export async function findStartFiles(projectPath: string): Promise<FindStartFilesResponse> {
  try {
    const response = await fetch(
      `/api/server/find-start-files?project=${encodeURIComponent(projectPath)}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error finding start files:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Set the start file for a server
 */
export async function setStartFile(
  projectPath: string,
  startFile: string
): Promise<SetStartFileResponse> {
  try {
    const response = await fetch("/api/server/set-start-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: projectPath,
        startFile,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error setting start file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
