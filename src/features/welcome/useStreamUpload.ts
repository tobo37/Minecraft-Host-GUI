interface UploadResult {
  success: boolean;
  error?: string;
}

export function useStreamUpload() {
  const uploadStream = async (file: File): Promise<UploadResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000);

    try {
      const response = await fetch(
        `/api/upload-serverfile-stream?fileName=${encodeURIComponent(
          file.name
        )}&fileSize=${file.size}`,
        {
          method: "POST",
          body: file,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": file.size.toString(),
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || "Stream upload failed" };
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

  return { uploadStream };
}
