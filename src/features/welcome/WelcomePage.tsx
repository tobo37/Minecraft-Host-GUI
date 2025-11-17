import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect, useCallback } from "react";
import { ServerFileUpload } from "./ServerFileUpload";
import { ServerFileList } from "./ServerFileList";
import { ServerFileSelector } from "./ServerFileSelector";
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
    setUploadStatus(getUploadMessage(file.size));

    const result = await uploadFile(file);

    if (result.success) {
      setUploadStatus(`✅ ${file.name} erfolgreich hochgeladen`);
      await loadServerFiles();
      setSelectedServerFile(file.name);
      setTimeout(() => setUploadStatus(null), 3000);
    } else {
      setUploadStatus(`❌ Upload-Fehler: ${result.error}`);
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const getUploadMessage = (fileSize: number): string => {
    const sizeGB = fileSize / (1024 * 1024 * 1024);
    if (fileSize > 500 * 1024 * 1024) {
      return `📤 Uploading ${sizeGB.toFixed(
        1
      )} GB file with direct streaming - this may take 10-20 minutes...`;
    }
    if (sizeGB > 0.1) {
      return `📤 Uploading ${sizeGB.toFixed(
        1
      )} GB file - this may take several minutes...`;
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
      const errorMsg =
        error instanceof Error ? error.message : "Unbekannter Fehler";
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

  const handleServerCreationSuccess = (data: {
    status: string;
    serverPath: string;
  }) => {
    if (data.status === "success") {
      setServerStatus(
        `✅ ${translations.messages.serverCreating} (${data.serverPath})`
      );
    } else if (data.status === "exists") {
      setServerStatus(
        `ℹ️ ${translations.messages.serverExists} (${data.serverPath})`
      );
    }
    setTimeout(() => onServerCreated(data.serverPath), 1500);
  };

  const handleServerCreationError = (error: unknown) => {
    if (error instanceof Error && error.name === "AbortError") {
      setServerStatus(
        `❌ ${translations.messages.serverError}: Timeout nach 60 Sekunden`
      );
    } else {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Unbekannter Fehler";
      setServerStatus(`❌ ${translations.messages.serverError}: ${message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm"></div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {translations.title}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground max-w-md mx-auto">
              {translations.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid gap-4 text-left">
              <h3 className="font-semibold text-foreground mb-2">
                {translations.features.title}
              </h3>
              <div className="grid gap-3">
                {translations.features.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

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
                <ServerFileList
                  files={serverFiles}
                  onDelete={handleDeleteServerFile}
                />
              </>
            )}

            <div className="flex flex-col items-center gap-4 pt-4">
              <Button
                onClick={handleCreateServer}
                disabled={isCreating || !selectedServerFile}
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

              {serverStatus && (
                <div className="text-sm text-center max-w-md">
                  {serverStatus}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
