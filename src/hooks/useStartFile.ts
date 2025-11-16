import { useState } from "react";

interface UseStartFileProps {
  projectPath: string;
  currentStartFile?: string;
  onSuccess?: () => void;
}

export function useStartFile({ projectPath, currentStartFile, onSuccess }: UseStartFileProps) {
  const [isStartFileDialogOpen, setIsStartFileDialogOpen] = useState(false);
  const [startFileCandidates, setStartFileCandidates] = useState<any[]>([]);
  const [selectedStartFile, setSelectedStartFile] = useState<string>("");
  const [isSearchingStartFiles, setIsSearchingStartFiles] = useState(false);

  const handleFindStartFiles = async () => {
    setIsSearchingStartFiles(true);
    setIsStartFileDialogOpen(true);

    try {
      const response = await fetch(
        `/api/server/find-start-files?project=${encodeURIComponent(projectPath)}`
      );
      const data = await response.json();

      if (data.success) {
        setStartFileCandidates(data.candidates || []);
        if (currentStartFile) {
          setSelectedStartFile(currentStartFile);
        } else if (data.candidates && data.candidates.length > 0) {
          const highConfidence = data.candidates.find(
            (c: any) => c.confidence === "high"
          );
          setSelectedStartFile(
            highConfidence?.path || data.candidates[0].path
          );
        }
      } else {
        console.error("Failed to find start files:", data.error);
      }
    } catch (error) {
      console.error("Error finding start files:", error);
    } finally {
      setIsSearchingStartFiles(false);
    }
  };

  const handleSetStartFile = async () => {
    if (!selectedStartFile) return;

    try {
      const response = await fetch("/api/server/set-start-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          startFile: selectedStartFile,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess?.();
        closeStartFileDialog();
      } else {
        console.error("Failed to set start file:", data.error);
        alert("Fehler beim Speichern der Startdatei: " + (data.error || "Unbekannter Fehler"));
      }
    } catch (error) {
      console.error("Error setting start file:", error);
      alert("Fehler beim Speichern der Startdatei");
    }
  };

  const closeStartFileDialog = () => {
    setIsStartFileDialogOpen(false);
    setStartFileCandidates([]);
    setSelectedStartFile("");
  };

  return {
    isStartFileDialogOpen,
    startFileCandidates,
    selectedStartFile,
    isSearchingStartFiles,
    setSelectedStartFile,
    handleFindStartFiles,
    handleSetStartFile,
    closeStartFileDialog,
    setIsStartFileDialogOpen,
  };
}
