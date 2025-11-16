import { useState } from "react";
import { useLanguage } from "./useLanguage";

interface UseServerMetadataProps {
  projectPath: string;
  onSuccess?: () => void;
}

export function useServerMetadata({ projectPath, onSuccess }: UseServerMetadataProps) {
  const { translations } = useLanguage();
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleRename = async () => {
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!newName.trim() || !nameRegex.test(newName)) {
      setValidationError(
        translations.serverManagement.renameDialog.validationError
      );
      return;
    }

    try {
      const response = await fetch("/api/server/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          customName: newName.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsRenameDialogOpen(false);
        setValidationError("");
        onSuccess?.();
      } else {
        setValidationError(data.error || "Failed to rename server");
      }
    } catch (error) {
      console.error("Error renaming server:", error);
      setValidationError("Failed to rename server");
    }
  };

  const openRenameDialog = (currentName: string) => {
    setNewName(currentName);
    setValidationError("");
    setIsRenameDialogOpen(true);
  };

  const closeRenameDialog = (currentName: string) => {
    setIsRenameDialogOpen(false);
    setValidationError("");
    setNewName(currentName);
  };

  return {
    isRenameDialogOpen,
    newName,
    validationError,
    setNewName,
    setValidationError,
    handleRename,
    openRenameDialog,
    closeRenameDialog,
  };
}
