import { useState } from "react";
import { useLanguage } from "./useLanguage";

interface UseServerDeleteProps {
  projectPath: string;
  onSuccess?: () => void;
}

export function useServerDelete({ projectPath, onSuccess }: UseServerDeleteProps) {
  const { translations } = useLanguage();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteValidationError, setDeleteValidationError] = useState("");

  const handleDeleteServer = async (serverName: string) => {
    if (deleteConfirmName.trim() !== serverName) {
      setDeleteValidationError(translations.serverManagement.deleteDialog.validationError);
      return;
    }

    try {
      const response = await fetch(
        `/api/server/delete?project=${encodeURIComponent(projectPath)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (data.success) {
        setIsDeleteDialogOpen(false);
        onSuccess?.();
      } else {
        setDeleteValidationError(data.error || "Failed to delete server");
      }
    } catch (error) {
      console.error("Error deleting server:", error);
      setDeleteValidationError("Failed to delete server");
    }
  };

  const openDeleteDialog = () => {
    setDeleteConfirmName("");
    setDeleteValidationError("");
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmName("");
    setDeleteValidationError("");
  };

  return {
    isDeleteDialogOpen,
    deleteConfirmName,
    deleteValidationError,
    setDeleteConfirmName,
    setDeleteValidationError,
    handleDeleteServer,
    openDeleteDialog,
    closeDeleteDialog,
  };
}
