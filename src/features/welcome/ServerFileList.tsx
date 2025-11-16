import { Button } from "@/components/ui/button";

interface ServerFile {
  name: string;
  size: number;
  uploadedAt: string;
}

interface ServerFileListProps {
  files: ServerFile[];
  onDelete: (filename: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function ServerFileList({ files, onDelete }: ServerFileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
        <p className="font-medium mb-1">Keine Server-Dateien vorhanden</p>
        <p>
          Lade eine ZIP-Datei mit deinen Minecraft-Server-Dateien hoch, um zu
          beginnen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Verfügbare Server-Dateien:
      </h4>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(file.name)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
            >
              🗑️
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
