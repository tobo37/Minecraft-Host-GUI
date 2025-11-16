import { logger } from "@/lib/logger";
import { getJabbaPath, execJabba, parseJabbaVersions } from "./jabbaUtils";

export interface JabbaInfo {
  installed: boolean;
  versions?: string[];
  current?: string;
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
    const jabbaPath = getJabbaPath();
    const fileExists = await Bun.file(jabbaPath).exists();
    
    if (!fileExists) {
      return { installed: false };
    }

    const jabbaCheck = await execJabba(['--version']);
    
    if (jabbaCheck.exitCode !== 0) {
      return { installed: false };
    }

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
