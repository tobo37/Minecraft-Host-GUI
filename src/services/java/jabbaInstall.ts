import { $ } from "bun";
import { join } from "path";
import { homedir } from "os";
import { logger } from "@/lib/logger";

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
