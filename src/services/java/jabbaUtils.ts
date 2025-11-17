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
  const homeDir = homedir();
  const isWindows = process.platform === "win32";

  if (isWindows) {
    return join(homeDir, ".jabba", "bin", "jabba.exe");
  } else {
    return join(homeDir, ".jabba", "bin", "jabba");
  }
}

/**
 * Check if a Java version directory exists
 * Jabba stores versions in ~/.jabba/jdk/<version>
 */
async function isVersionDirectoryPresent(version: string): Promise<boolean> {
  try {
    const homeDir = homedir();
    const jabbaDir = join(homeDir, ".jabba", "jdk", version);

    logger.info(`Checking if version directory exists: ${jabbaDir}`);

    // Use fs.stat to check if directory exists
    const fs = require("fs").promises;
    try {
      const stats = await fs.stat(jabbaDir);
      const exists = stats.isDirectory();
      logger.info(`Version directory ${version} exists: ${exists}`);
      return exists;
    } catch (_statError) {
      logger.info(`Version directory ${version} does not exist`);
      return false;
    }
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

  // Debug: List all installed versions
  const homeDir = homedir();
  const jdkDir = join(homeDir, ".jabba", "jdk");
  try {
    const fs = require("fs").promises;
    const entries = await fs.readdir(jdkDir);
    logger.info(`Available JDK directories in ${jdkDir}:`);
    entries.forEach((entry: string) => logger.info(`  - ${entry}`));
  } catch (error) {
    logger.warn(`Could not list JDK directory: ${error}`);
  }

  // Validate that the version is installed
  const versionExists = await isVersionDirectoryPresent(version);
  if (!versionExists) {
    const errorMessage = `Java version ${version} is not installed. Cannot load environment.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const isWindows = process.platform === "win32";
  const jabbaDir = join(homeDir, ".jabba", "jdk", version);
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
 * Execute Jabba command with proper shell environment
 */
export async function execJabba(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const homeDir = homedir();
  const isWindows = process.platform === "win32";

  try {
    let result;

    if (isWindows) {
      // Windows: Use PowerShell to source Jabba and run command
      const jabbaPath = getJabbaPath();
      const command = `${jabbaPath} ${args.join(" ")}`;
      result = await $`powershell -Command ${command}`.quiet().nothrow();
    } else {
      // Unix: Source jabba.sh and run command in bash
      const jabbaScript = join(homeDir, ".jabba", "jabba.sh");
      const command = `source ${jabbaScript} && jabba ${args.join(" ")}`;
      result = await $`bash -c ${command}`.quiet().nothrow();
    }

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
