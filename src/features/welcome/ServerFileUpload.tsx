import { useRef } from "react";

interface ServerFileUploadProps {
  isUploading: boolean;
  isDragOver: boolean;
  uploadStatus: string | null;
  uploadProgress: number;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
  onFileSelect: React.ChangeEventHandler<HTMLInputElement>;
}

export function ServerFileUpload({
  isUploading,
  isDragOver,
  uploadStatus,
  uploadProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: ServerFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">
        Server-Dateien verwalten
      </h3>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={onFileSelect}
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
    </div>
  );
}
