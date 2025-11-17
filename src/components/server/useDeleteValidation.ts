import { useState, useCallback } from "react";

interface UseDeleteValidationProps {
  serverName: string;
  confirmName: string;
  validationErrorMessage: string;
}

export function useDeleteValidation({
  serverName,
  confirmName,
  validationErrorMessage,
}: UseDeleteValidationProps) {
  const [error, setError] = useState("");

  const validateDelete = useCallback((): boolean => {
    if (confirmName.trim() !== serverName) {
      setError(validationErrorMessage);
      return false;
    }
    setError("");
    return true;
  }, [confirmName, serverName, validationErrorMessage]);

  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    error,
    validateDelete,
    clearError,
  };
}
