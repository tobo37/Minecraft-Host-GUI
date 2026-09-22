import { useState } from "react";

interface ModpackVersion {
  id: number;
  displayName: string;
  gameVersion: string;
  releaseType: "release" | "beta" | "alpha";
  fileDate: string;
}

interface ResolvedModpack {
  platform: "curseforge";
  modId: number;
  name: string;
  versions: ModpackVersion[];
}

interface ImportResult {
  success: boolean;
  error?: string;
  filename?: string;
  modpackInfo?: { name: string; version: string };
}

/**
 * Drives the "import server via link" flow: first try to recognize the URL
 * as a CurseForge modpack project (offering a version picker), otherwise
 * fall back to treating it as a direct download link.
 */
export function useModpackImport() {
  const [isResolving, setIsResolving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resolved, setResolved] = useState<ResolvedModpack | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  const resolveLink = async (url: string): Promise<{ recognized: boolean; error?: string }> => {
    setIsResolving(true);
    setResolved(null);
    setSelectedVersionId(null);

    try {
      const response = await fetch("/api/modpack/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();

      if (data.recognized === false) {
        return { recognized: false };
      }

      if (!data.success) {
        return { recognized: true, error: data.error || "Modpack konnte nicht aufgelöst werden" };
      }

      setResolved(data as ResolvedModpack);
      setSelectedVersionId((data as ResolvedModpack).versions[0]?.id ?? null);
      return { recognized: true };
    } catch (error) {
      return {
        recognized: true,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    } finally {
      setIsResolving(false);
    }
  };

  const importDirectUrl = async (url: string): Promise<ImportResult> => {
    setIsImporting(true);
    try {
      const response = await fetch("/api/import-serverfile-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    } finally {
      setIsImporting(false);
    }
  };

  const importSelectedVersion = async (): Promise<ImportResult> => {
    if (!resolved || selectedVersionId === null) {
      return { success: false, error: "Keine Version ausgewählt" };
    }
    const version = resolved.versions.find((v) => v.id === selectedVersionId);

    setIsImporting(true);
    try {
      const response = await fetch("/api/modpack/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modId: resolved.modId,
          fileId: selectedVersionId,
          modpackName: resolved.name,
          versionLabel: version?.displayName,
        }),
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setResolved(null);
    setSelectedVersionId(null);
  };

  return {
    isResolving,
    isImporting,
    resolved,
    selectedVersionId,
    setSelectedVersionId,
    resolveLink,
    importDirectUrl,
    importSelectedVersion,
    reset,
  };
}
