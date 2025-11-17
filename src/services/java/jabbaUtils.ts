import { join } from "path";
import { homedir } from "os";
import { $ } from "bun";
import { logger } from "@/lib/logger";
import { existsSync, readFileSync } from "fs";

/**
 * Detect if running in a Docker container
 */
export function isDockerEnvironment(): boolean {
  try {
    // Check for .dockerenv file (common indicator)
    if (existsSync("/.dockerenv")) {
      return true;
    }

    // Check cgroup for docker/containerd
    if (existsSync("/proc/self/cgroup")) {
      const cgroup = readFileSync("/proc/self/cgroup", "utf8");
      if (cgroup.includes("docker") || cgroup.includes("containerd")) {
        return true;
      }
    }

    // Check for DOCKER environment variable
    if (process.env.DOCKER === "true") {
      return true;
    }

    return false;
  } catch (_error) {
    // If we can't determine, assume not in Docker
    return false;
  }
}

/**
 * Get Jabba executable path based on platform
 */
export function getJabbaPath(): string {
  const home = homedir();
  const isWindows = process.platform === "win32";

  if (isWindows) {
    return join(home, ".jabba", "bin", "jabba.exe");
  } else {
    return join(home, ".jabba", "bin", "jabba");
  }
}

/**
 * Check if a Java version directory exists
 */
async function isVersionDirectoryPresent(version: string): Promise<boolean> {
  try {
    const home = homedir();
    const jabbaDir = join(home, ".jabba", "jdk", version);
    const file = Bun.file(jabbaDir);
    return await file.exists();
  } catch (error) {
    logger.error(`Error checking version directory for ${version}:`, error);
    return false;
  }
}

/**
 * Get Jabba environment variables for a specific version
 */
export async function getJabbaEnv(
  version: string
): Promise<Record<string, string>> {
  logger.info(`Loading Jabba environment for version: ${version}`);

  // Validate that the version is installed
  const versionExists = await isVersionDirectoryPresent(version);
  if (!versionExists) {
    const errorMessage = `Java version ${version} is not installed. Cannot load environment.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const home = homedir();
  const isWindows = process.platform === "win32";

  const jabbaDir = join(home, ".jabba", "jdk", version);
  const binPath = join(jabbaDir, "bin");

  let env: Record<string, string>;

  if (isWindows) {
    env = {
      JAVA_HOME: jabbaDir,
      PATH: `${binPath};${process.env.PATH || ""}`,
    };
  } else {
    env = {
      JAVA_HOME: jabbaDir,
      PATH: `${binPath}:${process.env.PATH || ""}`,
    };
  }

  logger.info(`Jabba environment loaded successfully`);
  logger.info(`JAVA_HOME: ${env.JAVA_HOME}`);
  logger.info(`PATH prefix: ${binPath}`);

  return env;
}

/**
 * Execute Jabba command directly
 */
export async function execJabba(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const jabbaPath = getJabbaPath();

  try {
    const result = await $`${jabbaPath} ${args}`.quiet().nothrow();
    return {
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  } catch (error) {
    logger.error("Error executing Jabba:", error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse Jabba version list output
 */
export function parseJabbaVersions(output: string): {
  versions: string[];
  current?: string;
} {
  const versions: string[] = [];
  let current: string | undefined;

  const lines = output.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("*")) {
      const version = trimmed.substring(1).trim();
      versions.push(version);
      current = version;
    } else if (trimmed) {
      versions.push(trimmed);
    }
  }

  return { versions, current };
}
