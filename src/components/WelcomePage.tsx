import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useRef, useEffect } from "react";

interface WelcomePageProps {
  onServerCreated: (serverPath: string) => void;
}

interface ServerFile {
  name: string;
  size: number;
  uploadedAt: string;
}

export function WelcomePage({ onServerCreated }: WelcomePageProps) {
  const { translations } = useLanguage();
  const [isCreating, setIsCreating] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [selectedServerFile, setSelectedServerFile] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available server files on component mount
  useEffect(() => {
    loadServerFiles();
  }, []);

  const loadServerFiles = async () => {
    try {
      const response = await fetch("/api/serverfiles");
      const data = await response.json();
      if (data.success) {
        setServerFiles(data.files);
        // Auto-select first file if available
        if (data.files.length > 0 && !selectedServerFile) {
          setSelectedServerFile(data.files[0].name);
        }
      }
    } catch (error) {
      console.error("Error loading server files:", error);
    }
  };

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
    const zipFiles = files.filter((file) =>
      file.name.toLowerCase().endsWith(".zip")
    );

    if (zipFiles.length > 0 && zipFiles[0]) {
      handleFileUpload(zipFiles[0]);
    } else {
      setUploadStatus("❌ Bitte nur ZIP-Dateien hochladen");
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        handleFileUpload(file);
      } else {
        setUploadStatus("❌ Bitte nur ZIP-Dateien auswählen");
        setTimeout(() => setUploadStatus(null), 3000);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus(null);
    setUploadProgress(0);

    try {
      const fileSizeGB = file.size / (1024 * 1024 * 1024);

      // Use stream upload for files larger than 500MB to avoid formData memory issues
      if (file.size > 500 * 1024 * 1024) {
        setUploadStatus(
          `📤 Uploading ${fileSizeGB.toFixed(
            1
          )} GB file with direct streaming - this may take 10-20 minutes...`
        );
        await handleStreamUpload(file);
      } else {
        // Use regular FormData upload for smaller files
        if (fileSizeGB > 0.1) {
          setUploadStatus(
            `📤 Uploading ${fileSizeGB.toFixed(
              1
            )} GB file - this may take several minutes...`
          );
        }
        await handleRegularUpload(file);
      }

      setUploadStatus(`✅ ${file.name} erfolgreich hochgeladen`);
      await loadServerFiles(); // Reload the list
      setSelectedServerFile(file.name); // Auto-select the uploaded file
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setUploadStatus(
          `❌ Upload-Timeout: Datei zu groß oder Verbindung zu langsam`
        );
      } else {
        setUploadStatus(
          `❌ Upload-Fehler: ${
            error instanceof Error ? error.message : "Unbekannter Fehler"
          }`
        );
      }
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRegularUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("serverfile", file);

    // Create AbortController for timeout (20 minutes for very large files)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000); // 20 minutes

    const response = await fetch("/api/upload-serverfile", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Upload failed");
    }
  };

  const handleStreamUpload = async (file: File) => {
    // Create AbortController for timeout (30 minutes for very large files)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000); // 30 minutes

    console.log(`Starting stream upload for ${file.name} (${file.size} bytes)`);

    const response = await fetch(
      `/api/upload-serverfile-stream?fileName=${encodeURIComponent(
        file.name
      )}&fileSize=${file.size}`,
      {
        method: "POST",
        body: file, // Send file directly as body (no FormData!)
        signal: controller.signal,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": file.size.toString(),
        },
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Stream upload failed");
    }

    console.log("Stream upload completed successfully");
  };

  const handleDeleteServerFile = async (filename: string) => {
    if (!confirm(`Möchtest du die Datei "${filename}" wirklich löschen?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/delete-serverfile?filename=${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        setUploadStatus(`✅ ${filename} wurde gelöscht`);
        await loadServerFiles(); // Reload the list

        // If the deleted file was selected, clear selection
        if (selectedServerFile === filename) {
          setSelectedServerFile("");
        }

        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        setUploadStatus(`❌ Löschen fehlgeschlagen: ${data.error}`);
        setTimeout(() => setUploadStatus(null), 5000);
      }
    } catch (error) {
      setUploadStatus(
        `❌ Lösch-Fehler: ${
          error instanceof Error ? error.message : "Unbekannter Fehler"
        }`
      );
      setTimeout(() => setUploadStatus(null), 5000);
    }
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
      // Längerer Timeout für Server-Erstellung (60 Sekunden)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("/api/create-server", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverFile: selectedServerFile,
          customName: customName.trim() || undefined,
          description: description.trim() || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        if (data.status === "success") {
          setServerStatus(
            `✅ ${translations.messages.serverCreating} (${data.serverPath})`
          );
          // Nach kurzer Verzögerung direkt zur Server-Seite wechseln
          setTimeout(() => {
            onServerCreated(data.serverPath);
          }, 1500);
        } else if (data.status === "exists") {
          setServerStatus(
            `ℹ️ ${translations.messages.serverExists} (${data.serverPath})`
          );
          setTimeout(() => {
            onServerCreated(data.serverPath);
          }, 1500);
        }
      } else {
        console.error("Server creation failed:", data);
        setServerStatus(
          `❌ ${translations.messages.serverError}: ${
            data.message || "Unbekannter Fehler"
          }`
        );
        if (data.error) {
          console.error("Detailed error:", data.error);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setServerStatus(
          `❌ ${translations.messages.serverError}: Timeout nach 60 Sekunden`
        );
      } else {
        setServerStatus(`❌ ${translations.messages.serverError}`);
      }
      console.error("Fehler:", error);
    } finally {
      setIsCreating(false);
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

            {/* Server File Upload Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">
                Server-Dateien verwalten
              </h3>

              {serverFiles.length === 0 && (
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <p className="font-medium mb-1">
                    Keine Server-Dateien vorhanden
                  </p>
                  <p>
                    Lade eine ZIP-Datei mit deinen Minecraft-Server-Dateien
                    hoch, um zu beginnen.
                  </p>
                </div>
              )}

              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground">
                      Datei wird hochgeladen...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bei großen Dateien kann dies mehrere Minuten dauern
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      📦
                    </div>
                    <p className="font-medium">
                      ZIP-Datei hier ablegen oder klicken
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Lade deine Minecraft-Server ZIP-Dateien hoch (max. 2GB)
                    </p>
                  </div>
                )}
              </div>

              {uploadStatus && (
                <div className="text-sm text-center">
                  {uploadStatus}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              {/* Server File Selection */}
              {serverFiles.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Server-Datei auswählen:
                  </label>
                  <Select
                    value={selectedServerFile}
                    onValueChange={setSelectedServerFile}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wähle eine Server-Datei..." />
                    </SelectTrigger>
                    <SelectContent>
                      {serverFiles.map((file) => (
                        <SelectItem key={file.name} value={file.name}>
                          <div className="flex flex-col">
                            <span>{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {file.size > 1024 * 1024 * 1024
                                ? `${(file.size / 1024 / 1024 / 1024).toFixed(
                                    1
                                  )} GB`
                                : `${(file.size / 1024 / 1024).toFixed(
                                    1
                                  )} MB`}{" "}
                              • {new Date(file.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Custom Name Input */}
                  <div className="space-y-2">
                    <Label htmlFor="customName" className="text-sm font-medium">
                      Server Name (optional)
                    </Label>
                    <Input
                      id="customName"
                      type="text"
                      placeholder="e.g., ATM9 Survival, Tekkit Creative"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      maxLength={100}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use ZIP filename
                    </p>
                  </div>

                  {/* Description Input */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Description (optional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your server..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {description.length}/500 characters
                    </p>
                  </div>

                  {/* File Management */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Verfügbare Server-Dateien:
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {serverFiles.map((file) => (
                        <div
                          key={file.name}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {file.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {file.size > 1024 * 1024 * 1024
                                ? `${(file.size / 1024 / 1024 / 1024).toFixed(
                                    1
                                  )} GB`
                                : `${(file.size / 1024 / 1024).toFixed(
                                    1
                                  )} MB`}{" "}
                              • {new Date(file.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteServerFile(file.name)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                          >
                            🗑️
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

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
