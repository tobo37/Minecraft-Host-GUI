interface UploadResult {
  success: boolean;
  error?: string;
}

export function useRegularUpload() {
  const uploadRegular = async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("serverfile", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000);

    try {
      const response = await fetch("/api/upload-serverfile", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || "Upload failed" };
      }

      return { success: true };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Upload-Timeout: Datei zu groß oder Verbindung zu langsam",
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
      };
    }
  };

  return { uploadRegular };
}
