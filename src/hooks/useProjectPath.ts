import { useState } from "react";
import { updateServerMetadata } from "@/services/metadataClient";

interface UseProjectPathProps {
  projectPath: string;
  currentProjectPath?: string;
  onSuccess?: () => void;
}

export function useProjectPath({
  projectPath,
  currentProjectPath,
  onSuccess,
}: UseProjectPathProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState("");
  const [validationError, setValidationError] = useState("");

  const openDialog = () => {
    setNewProjectPath(currentProjectPath || "");
    setValidationError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewProjectPath("");
    setValidationError("");
  };

  const handleSetProjectPath = async () => {
    try {
      const trimmedPath = newProjectPath.trim();

      const response = await updateServerMetadata(projectPath, {
        projectPath: trimmedPath || undefined,
      });

      if (response.success) {
        closeDialog();
        onSuccess?.();
      } else {
        setValidationError(response.error || "Failed to update project path");
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  return {
    isDialogOpen,
    newProjectPath,
    validationError,
    setNewProjectPath,
    setValidationError,
    handleSetProjectPath,
    openDialog,
    closeDialog,
  };
}
