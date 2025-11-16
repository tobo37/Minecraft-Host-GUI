import { useState } from "react";

interface UseServerDescriptionProps {
  projectPath: string;
  onSuccess?: () => void;
}

export function useServerDescription({ projectPath, onSuccess }: UseServerDescriptionProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  const handleUpdateDescription = async () => {
    try {
      const response = await fetch("/api/server/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: projectPath,
          description: newDescription,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditingDescription(false);
        onSuccess?.();
      } else {
        console.error("Failed to update description:", data.error);
      }
    } catch (error) {
      console.error("Error updating description:", error);
    }
  };

  const startEditing = (currentDescription: string) => {
    setNewDescription(currentDescription);
    setIsEditingDescription(true);
  };

  const cancelEditing = (currentDescription: string) => {
    setIsEditingDescription(false);
    setNewDescription(currentDescription);
  };

  return {
    isEditingDescription,
    newDescription,
    setNewDescription,
    handleUpdateDescription,
    startEditing,
    cancelEditing,
  };
}
