import { useState } from "react";
import {
  findStartFiles,
  setStartFile,
  type StartFileCandidate,
} from "@/services/startFileClient";
import {
  validateStartFileSelection,
  getDefaultStartFile,
  validateCandidatesResponse,
} from "./useStartFileValidation";

interface UseStartFileProps {
  projectPath: string;
  currentStartFile?: string;
  onSuccess?: () => void;
}

export function useStartFile({
  projectPath,
  currentStartFile,
  onSuccess,
}: UseStartFileProps) {
  const [isStartFileDialogOpen, setIsStartFileDialogOpen] = useState(false);
  const [startFileCandidates, setStartFileCandidates] = useState<
    StartFileCandidate[]
  >([]);
  const [selectedStartFile, setSelectedStartFile] = useState<string>("");
  const [isSearchingStartFiles, setIsSearchingStartFiles] = useState(false);

  const handleFindStartFiles = async () => {
    setIsSearchingStartFiles(true);
    setIsStartFileDialogOpen(true);

    try {
      const data = await findStartFiles(projectPath);

      if (validateCandidatesResponse(data)) {
        const candidates = data.candidates || [];
        setStartFileCandidates(candidates);
        
        const defaultFile = getDefaultStartFile(candidates, currentStartFile);
        setSelectedStartFile(defaultFile);
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
    if (!validateStartFileSelection(selectedStartFile)) return;

    try {
      const data = await setStartFile(projectPath, selectedStartFile);
      
      if (data.success) {
        onSuccess?.();
        closeStartFileDialog();
      } else {
        console.error("Failed to set start file:", data.error);
        alert(
          "Fehler beim Speichern der Startdatei: " +
            (data.error || "Unbekannter Fehler")
        );
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
