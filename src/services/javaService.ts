import { $ } from "bun";
import { join } from "path";
import { homedir } from "os";
import { logger } from "@/lib/logger";

interface JavaInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

interface JabbaInfo {
  installed: boolean;
  versions?: string[];
  current?: string;
}

/**
 * Get Jabba executable path based on platform
 */
function getJabbaPath(): string {
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
async function getJabbaEnv(version: string): Promise<Record<string, string>> {
  const home = homedir();
  const isWindows = process.platform === 'win32';
  
  // Construct the Java home path based on Jabba's directory structure
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
async function execJabba(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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
 * Load Jabba environment if a version is currently selected
 */
export async function loadJabbaEnvironment(): Promise<void> {
  try {
    const jabbaInfo = await getJabbaInfo();
    
    if (jabbaInfo.installed && jabbaInfo.current) {
      const jabbaEnv = await getJabbaEnv(jabbaInfo.current);
      process.env.JAVA_HOME = jabbaEnv.JAVA_HOME;
      process.env.PATH = jabbaEnv.PATH;
      logger.info(`Loaded Jabba environment: ${jabbaInfo.current} (JAVA_HOME=${jabbaEnv.JAVA_HOME})`);
    }
  } catch (error) {
    logger.error("Error loading Jabba environment:", error);
  }
}

/**
 * Get Java installation information
 */
export async function getJavaInfo(): Promise<JavaInfo> {
  try {
    // Try to get Java version
    const result = await $`java -version`.quiet().nothrow();
    
    if (result.exitCode === 0) {
      // Parse version from stderr (Java outputs version info to stderr)
      const output = result.stderr.toString();
      const versionMatch = output.match(/version "(.+?)"/);
      const version = versionMatch ? versionMatch[1] : "Unknown";

      // Get Java path (Windows uses 'where', Unix uses 'which')
      const isWindows = process.platform === 'win32';
      const pathCommand = isWindows ? 'where' : 'which';
      const pathResult = await $`${pathCommand} java`.quiet().nothrow();
      const path = pathResult.exitCode === 0 
        ? pathResult.stdout.toString().trim().split('\n')[0]
        : undefined;

      return {
        installed: true,
        version,
        path,
      };
    }

    return { installed: false };
  } catch (error) {
    logger.error("Error checking Java:", error);
    return { installed: false };
  }
}

/**
 * Parse Jabba version list output
 */
function parseJabbaVersions(output: string): { versions: string[]; current?: string } {
  const versions: string[] = [];
  let current: string | undefined;
  
  const lines = output.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('*')) {
      // Current version
      const version = trimmed.substring(1).trim();
      versions.push(version);
      current = version;
    } else if (trimmed) {
      versions.push(trimmed);
    }
  }
  
  return { versions, current };
}

/**
 * Get installed Jabba versions
 */
async function getInstalledVersions(): Promise<{ versions: string[]; current?: string }> {
  const listResult = await execJabba(['ls']);
  
  if (listResult.exitCode !== 0) {
    return { versions: [] };
  }
  
  return parseJabbaVersions(listResult.stdout);
}

/**
 * Get Jabba installation information
 */
export async function getJabbaInfo(): Promise<JabbaInfo> {
  try {
    // Check if Jabba binary exists
    const jabbaPath = getJabbaPath();
    const fileExists = await Bun.file(jabbaPath).exists();
    
    if (!fileExists) {
      return { installed: false };
    }

    // Check if Jabba works
    const jabbaCheck = await execJabba(['--version']);
    
    if (jabbaCheck.exitCode !== 0) {
      return { installed: false };
    }

    // Get list of installed versions
    const { versions, current } = await getInstalledVersions();

    return {
      installed: true,
      versions,
      current,
    };
  } catch (error) {
    logger.error("Error checking Jabba:", error);
    return { installed: false };
  }
}

/**
 * Download and execute Windows installer
 */
async function installJabbaWindows(home: string): Promise<{ success: boolean; error?: string }> {
  const installerUrl = 'https://github.com/shyiko/jabba/raw/master/install.ps1';
  
  const response = await fetch(installerUrl);
  if (!response.ok) {
    return {
      success: false,
      error: `Failed to download installer: ${response.statusText}`,
    };
  }
  
  const scriptContent = await response.text();
  const tempScript = join(home, 'jabba-install.ps1');
  
  await Bun.write(tempScript, scriptContent);
  
  const result = await $`powershell -ExecutionPolicy Bypass -File ${tempScript}`.nothrow();
  
  // Clean up temp file
  try {
    await $`del ${tempScript}`.quiet().nothrow();
  } catch (_error) {
    // Ignore cleanup errors
  }

  if (result.exitCode === 0) {
    return { success: true };
  }

  return {
    success: false,
    error: `Installation failed: ${result.stderr.toString()}`,
  };
}

/**
 * Install Jabba on Unix systems
 */
async function installJabbaUnix(): Promise<{ success: boolean; error?: string }> {
  const result = await $`curl -sL https://github.com/shyiko/jabba/raw/master/install.sh | bash`.nothrow();

  if (result.exitCode === 0) {
    return { success: true };
  }

  return {
    success: false,
    error: `Installation failed with exit code ${result.exitCode}`,
  };
}

/**
 * Install Jabba
 */
export async function installJabba(): Promise<{ success: boolean; error?: string }> {
  try {
    const isWindows = process.platform === 'win32';
    const home = homedir();
    
    if (isWindows) {
      try {
        return await installJabbaWindows(home);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Download failed",
        };
      }
    }
    
    return await installJabbaUnix();
  } catch (error) {
    logger.error("Error installing Jabba:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get available Java versions from Jabba
 */
export async function getAvailableVersions(): Promise<{ success: boolean; versions?: string[]; error?: string }> {
  try {
    const result = await execJabba(['ls-remote']);

    if (result.exitCode === 0) {
      const versions = result.stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return { success: true, versions };
    }

    return {
      success: false,
      error: `Failed to get available versions. ${result.stderr}`,
    };
  } catch (error) {
    logger.error("Error getting available versions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Install a Java version using Jabba
 */
export async function installJabbaVersion(version: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await execJabba(['install', version]);

    if (result.exitCode === 0) {
      return { success: true };
    }

    return {
      success: false,
      error: `Failed to install version ${version}. ${result.stderr}`,
    };
  } catch (error) {
    logger.error("Error installing Java version:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Switch Java version using Jabba and update process environment
 */
export async function setJabbaVersion(version: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await execJabba(['use', version]);

    if (result.exitCode === 0) {
      // Update the current process environment variables
      const jabbaEnv = await getJabbaEnv(version);
      process.env.JAVA_HOME = jabbaEnv.JAVA_HOME;
      process.env.PATH = jabbaEnv.PATH;
      
      logger.info(`Updated environment: JAVA_HOME=${jabbaEnv.JAVA_HOME}`);
      
      return { success: true };
    }

    return {
      success: false,
      error: `Failed to switch to version ${version}. ${result.stderr}`,
    };
  } catch (error) {
    logger.error("Error switching Java version:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * API handler for Java info
 */
export async function handleJavaInfo(): Promise<Response> {
  const info = await getJavaInfo();
  return Response.json(info);
}

/**
 * API handler for Jabba info
 */
export async function handleJabbaInfo(): Promise<Response> {
  const info = await getJabbaInfo();
  return Response.json(info);
}

/**
 * API handler for Jabba installation
 */
export async function handleJabbaInstall(): Promise<Response> {
  const result = await installJabba();
  return Response.json(result);
}

/**
 * API handler for getting available versions
 */
export async function handleJabbaLsRemote(): Promise<Response> {
  const result = await getAvailableVersions();
  return Response.json(result);
}

/**
 * API handler for installing a Java version
 */
export async function handleJabbaInstallVersion(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { version } = body;

    if (!version) {
      return Response.json({
        success: false,
        error: "Version is required",
      });
    }

    const result = await installJabbaVersion(version);
    return Response.json(result);
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * API handler for switching Java version
 */
export async function handleJabbaUse(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { version } = body;

    if (!version) {
      return Response.json({
        success: false,
        error: "Version is required",
      });
    }

    const result = await setJabbaVersion(version);
    return Response.json(result);
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
