/**
 * Client-side API for directory browsing
 */

export interface DirectoryNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  hasServerFiles?: boolean;
  serverFiles?: string[];
  children?: DirectoryNode[];
}

interface BrowseDirectoryResponse {
  success: boolean;
  tree?: DirectoryNode[];
  error?: string;
}

/**
 * Browse server directory structure
 */
export async function browseServerDirectory(project: string): Promise<BrowseDirectoryResponse> {
  const response = await fetch(
    `/api/server/browse-directory?project=${encodeURIComponent(project)}`
  );
  return await response.json();
}
