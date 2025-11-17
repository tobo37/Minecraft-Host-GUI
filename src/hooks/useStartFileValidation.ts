import type { StartFileCandidate } from "@/services/startFileClient";

/**
 * Validate that a start file is selected
 */
export function validateStartFileSelection(startFile: string): boolean {
  return startFile.trim().length > 0;
}

/**
 * Get the best default start file from candidates
 */
export function getDefaultStartFile(
  candidates: StartFileCandidate[],
  currentStartFile?: string
): string {
  if (currentStartFile) {
    return currentStartFile;
  }

  if (candidates.length === 0) {
    return "";
  }

  const highConfidence = candidates.find((c) => c.confidence === "high");
  return highConfidence?.path || candidates[0].path;
}

/**
 * Validate start file candidates response
 */
export function validateCandidatesResponse(
  data: { success: boolean; candidates?: StartFileCandidate[] }
): boolean {
  return data.success && Array.isArray(data.candidates);
}
