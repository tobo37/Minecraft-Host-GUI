import { useState, useCallback } from "react";

interface UseRenameValidationProps {
  newName: string;
  validationErrorMessage: string;
}

export function useRenameValidation({
  newName,
  validationErrorMessage,
}: UseRenameValidationProps) {
  const [error, setError] = useState("");

  const validateRename = useCallback((): boolean => {
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!newName.trim() || !nameRegex.test(newName)) {
      setError(validationErrorMessage);
      return false;
    }
    setError("");
    return true;
  }, [newName, validationErrorMessage]);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    error,
    validateRename,
    clearError,
  };
}
