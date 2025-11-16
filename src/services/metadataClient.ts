/**
 * Client-side API for server metadata operations
 */

interface MetadataUpdateData {
  customName?: string;
  description?: string;
  projectPath?: string;
  startFile?: string;
}

interface MetadataUpdateResponse {
  success: boolean;
  error?: string;
  metadata?: unknown;
}

/**
 * Update server metadata
 */
export async function updateServerMetadata(
  project: string,
  updates: MetadataUpdateData
): Promise<MetadataUpdateResponse> {
  const response = await fetch("/api/server/metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project,
      ...updates,
    }),
  });

  return await response.json();
}
