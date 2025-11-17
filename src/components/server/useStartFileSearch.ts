import { useState, useCallback } from "react";

interface StartFileCandidate {
  path: string;
  name: string;
  confidence: "high" | "medium" | "low";
  isExecutable: boolean;
  size: number;
}

interface UseStartFileSearchProps {
  projectPath: string;
  onSuccess?: () => void;
}

export function useStartFileSearch({
  projectPath,
  onSuccess,
}: UseStartFileSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<StartFileCandidate[]>([]);
  const [selectedFile, setSelectedFile] = useState("");

  const searchStartFiles = useCallback(async () => {
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/server/start-files?project=${encodeURIComponent(projectPath)}`
      );
      const data = await response.json();
      
      if (data.success && data.candidates) {
        setCandidates(data.candidates);
        if (data.candidates.length > 0) {
          setSelectedFile(data.candidates[0].path);
        }
      }
    } catch (error) {
      console.error("Error searching start files:", error);
    } finally {
      setIsSearching(false);
    }
  }, [projectPath]);

  const setStartFile = useCallback(async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch("/api/server/start-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          startFile: selectedFile,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error setting start file:", error);
    }
  }, [projectPath, selectedFile, onSuccess]);

  const reset = useCallback(() => {
    setCandidates([]);
    setSelectedFile("");
  }, []);

  return {
    isSearching,
    candidates,
    selectedFile,
    setSelectedFile,
    searchStartFiles,
    setStartFile,
    reset,
  };
}
