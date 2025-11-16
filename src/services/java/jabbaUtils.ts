import { join } from "path";
import { homedir } from "os";
import { $ } from "bun";
import { logger } from "@/lib/logger";

/**
 * Get Jabba executable path based on platform
 */
export function getJabbaPath(): string {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    return join(home, '.jabba', 'bin', 'jabba.exe');
  } else {
    return join(home, '.jabba', 'bin', 'jabba');
  }
}

/**
 * Get Jabba environment variables for a specific version
 */
export async function getJabbaEnv(version: string): Promise<Record<string, string>> {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  
  const jabbaDir = join(home, '.jabba', 'jdk', version);
  
  if (isWindows) {
    return {
      JAVA_HOME: jabbaDir,
      PATH: `${join(jabbaDir, 'bin')};${process.env.PATH || ''}`,
    };
  } else {
    return {
      JAVA_HOME: jabbaDir,
      PATH: `${join(jabbaDir, 'bin')}:${process.env.PATH || ''}`,
    };
  }
}

/**
 * Execute Jabba command directly
 */
export async function execJabba(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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
export function parseJabbaVersions(output: string): { versions: string[]; current?: string } {
  const versions: string[] = [];
  let current: string | undefined;
  
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('*')) {
      const version = trimmed.substring(1).trim();
      versions.push(version);
      current = version;
    } else if (trimmed) {
      versions.push(trimmed);
    }
  }
  
  return { versions, current };
}
