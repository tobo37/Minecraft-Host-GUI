import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect, useCallback } from "react";
import { ServerFileUpload } from "./ServerFileUpload";
import { ServerFileList } from "./ServerFileList";
import { ServerFileSelector } from "./ServerFileSelector";
import { ServerLinkImport } from "./ServerLinkImport";
import { useServerFileUpload } from "./useServerFileUpload";

export interface WelcomePageProps {
  onServerCreated: (_serverPath: string) => void;
}

interface ServerFile {
  name: string;
  size: number;
  uploadedAt: string;
}

export function WelcomePage({ onServerCreated }: WelcomePageProps) {
  const { translations } = useLanguage();
  const { isUploading, uploadProgress, uploadFile } = useServerFileUpload();

  const [isCreating, setIsCreating] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [selectedServerFile, setSelectedServerFile] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [sourceMode, setSourceMode] = useState<"upload" | "link">("upload");
  const [modpackInfo, setModpackInfo] = useState<{ name: string; version: string } | undefined>(
    undefined
  );

  const loadServerFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/serverfiles");
      const data = await response.json();
      if (data.success) {
        setServerFiles(data.files);
        if (data.files.length > 0 && !selectedServerFile) {
          setSelectedServerFile(data.files[0].name);
        }
      }
    } catch (error) {
      console.warn("Error loading server files:", error);
    }
  }, [selectedServerFile]);

  useEffect(() => {
    loadServerFiles();
  }, [loadServerFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find((f) => f.name.toLowerCase().endsWith(".zip"));

    if (zipFile) {
      handleFileUpload(zipFile);
    } else {
      showUploadError("Bitte nur ZIP-Dateien hochladen");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".zip")) {
      handleFileUpload(file);
    } else {
      showUploadError("Bitte nur ZIP-Dateien auswählen");
    }
  };

  const handleFileUpload = async (file: File) => {
    // A second drop while an upload is running would race the first one.
    if (isUploading) return;

    setUploadStatus(getUploadMessage(file.size));

    const result = await uploadFile(file);

    if (result.success) {
      setUploadStatus(`✅ ${file.name} erfolgreich hochgeladen`);
      setModpackInfo(undefined);
      await loadServerFiles();
      setSelectedServerFile(file.name);
      setTimeout(() => setUploadStatus(null), 3000);
    } else {
      setUploadStatus(`❌ Upload-Fehler: ${result.error}`);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handleLinkImported = async (
    filename: string,
    importedModpackInfo?: { name: string; version: string }
  ) => {
    setModpackInfo(importedModpackInfo);
    setUploadStatus(`✅ ${filename} erfolgreich importiert`);
    await loadServerFiles();
    setSelectedServerFile(filename);
    setTimeout(() => setUploadStatus(null), 3000);
  };

  const handleLinkImportError = (message: string) => {
    showUploadError(message);
  };

  const getUploadMessage = (fileSize: number): string => {
    const sizeGB = fileSize / (1024 * 1024 * 1024);
    if (fileSize > 500 * 1024 * 1024) {
      return `📤 Uploading ${sizeGB.toFixed(
        1
      )} GB file with direct streaming - this may take 10-20 minutes...`;
    }
    if (sizeGB > 0.1) {
      return `📤 Uploading ${sizeGB.toFixed(1)} GB file - this may take several minutes...`;
    }
    return "📤 Uploading file...";
  };

  const showUploadError = (message: string) => {
    setUploadStatus(`❌ ${message}`);
    setTimeout(() => setUploadStatus(null), 3000);
  };

  const handleDeleteServerFile = async (filename: string) => {
    if (!confirm(`Möchtest du die Datei "${filename}" wirklich löschen?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/delete-serverfile?filename=${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (data.success) {
        setUploadStatus(`✅ ${filename} wurde gelöscht`);
        await loadServerFiles();
        if (selectedServerFile === filename) {
          setSelectedServerFile("");
        }
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        setUploadStatus(`❌ Löschen fehlgeschlagen: ${data.error}`);
        setTimeout(() => setUploadStatus(null), 5000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unbekannter Fehler";
      setUploadStatus(`❌ Lösch-Fehler: ${errorMsg}`);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const createServerRequest = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("/api/create-server", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serverFile: selectedServerFile,
        customName: customName.trim() || undefined,
        description: description.trim() || undefined,
        modpackInfo,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  };

  const handleCreateServer = async () => {
    if (!selectedServerFile) {
      setServerStatus("❌ Bitte wähle eine Server-Datei aus");
      setTimeout(() => setServerStatus(null), 3000);
      return;
    }

    setIsCreating(true);
    setServerStatus(null);

    try {
      const response = await createServerRequest();
      const data = await response.json();

      if (response.ok) {
        handleServerCreationSuccess(data);
      } else {
        handleServerCreationError(data);
      }
    } catch (error) {
      handleServerCreationError(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleServerCreationSuccess = (data: { status: string; serverPath: string }) => {
    if (data.status === "success") {
      setServerStatus(`✅ ${translations.messages.serverCreating} (${data.serverPath})`);
    } else if (data.status === "exists") {
      setServerStatus(`ℹ️ ${translations.messages.serverExists} (${data.serverPath})`);
    }
    setTimeout(() => onServerCreated(data.serverPath), 1500);
  };

  const handleServerCreationError = (error: unknown) => {
    if (error instanceof Error && error.name === "AbortError") {
      setServerStatus(`❌ ${translations.messages.serverError}: Timeout nach 60 Sekunden`);
    } else {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Unbekannter Fehler";
      setServerStatus(`❌ ${translations.messages.serverError}: ${message}`);
    }
  };

  return (
    <div className="app-page flex items-center justify-center p-4">
      <div className="welcome-layout">
        <Card className="welcome-card">
          <div className="welcome-intro">
            <CardHeader className="space-y-6">
              <span className="grass-block" aria-hidden="true" />
              <CardTitle className="text-4xl font-bold text-primary">
                {translations.title}
              </CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                {translations.description}
              </CardDescription>
            </CardHeader>

            <div className="welcome-features grid gap-4 text-left">
              <h3 className="font-semibold text-foreground mb-2">{translations.features.title}</h3>
              <div className="grid gap-3">
                {translations.features.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <CardContent className="welcome-form space-y-6">
            <div className="flex gap-2" role="tablist" aria-label="Server-Quelle wählen">
              <Button
                type="button"
                variant={sourceMode === "upload" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceMode("upload")}
              >
                ZIP hochladen
              </Button>
              <Button
                type="button"
                variant={sourceMode === "link" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceMode("link")}
              >
                Link verwenden
              </Button>
            </div>

            {sourceMode === "upload" ? (
              <ServerFileUpload
                isUploading={isUploading}
                isDragOver={isDragOver}
                uploadStatus={uploadStatus}
                uploadProgress={uploadProgress}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileSelect={handleFileSelect}
              />
            ) : (
              <>
                <ServerLinkImport onImported={handleLinkImported} onError={handleLinkImportError} />
                {uploadStatus && <div className="text-sm text-center">{uploadStatus}</div>}
              </>
            )}

            {serverFiles.length > 0 && (
              <>
                <ServerFileSelector
                  files={serverFiles}
                  selectedFile={selectedServerFile}
                  customName={customName}
                  description={description}
                  onFileChange={setSelectedServerFile}
                  onNameChange={setCustomName}
                  onDescriptionChange={setDescription}
                />
                <ServerFileList files={serverFiles} onDelete={handleDeleteServerFile} />
              </>
            )}

            <div className="flex flex-col items-center gap-4 pt-4">
              <Button
                onClick={handleCreateServer}
                disabled={isCreating || isUploading || !selectedServerFile}
                size="lg"
                className="text-lg px-12 py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    {translations.messages.serverCreating}
                  </div>
                ) : (
                  translations.startButton
                )}
              </Button>

              {serverStatus && <div className="text-sm text-center max-w-md">{serverStatus}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
