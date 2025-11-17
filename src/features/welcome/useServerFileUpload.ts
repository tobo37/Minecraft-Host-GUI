import { useState } from "react";
import { useRegularUpload } from "./useRegularUpload";
import { useStreamUpload } from "./useStreamUpload";

interface UploadResult {
  success: boolean;
  error?: string;
}

export function useServerFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { uploadRegular } = useRegularUpload();
  const { uploadStream } = useStreamUpload();

  const uploadFile = async (file: File): Promise<UploadResult> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const isLargeFile = file.size > 500 * 1024 * 1024;
      const result = isLargeFile ? await uploadStream(file) : await uploadRegular(file);

      return result;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    isUploading,
    uploadProgress,
    uploadFile,
  };
}
