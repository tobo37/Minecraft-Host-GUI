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

interface ServerFile {
  name: string;
  size: number;
  uploadedAt: string;
}

interface ServerFileSelectorProps {
  files: ServerFile[];
  selectedFile: string;
  customName: string;
  description: string;
  onFileChange: (_value: string) => void;
  onNameChange: (_value: string) => void;
  onDescriptionChange: (_value: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ServerFileSelector({
  files,
  selectedFile,
  customName,
  description,
  onFileChange,
  onNameChange,
  onDescriptionChange,
}: ServerFileSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Server-Datei auswählen:</label>
      <Select value={selectedFile} onValueChange={onFileChange}>
        <SelectTrigger>
          <SelectValue placeholder="Wähle eine Server-Datei..." />
        </SelectTrigger>
        <SelectContent>
          {files.map((file) => (
            <SelectItem key={file.name} value={file.name}>
              <div className="flex flex-col">
                <span>{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)} •{" "}
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="space-y-2">
        <Label htmlFor="customName" className="text-sm font-medium">
          Server Name (optional)
        </Label>
        <Input
          id="customName"
          type="text"
          placeholder="e.g., ATM9 Survival, Tekkit Creative"
          value={customName}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={100}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use ZIP filename
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description (optional)
        </Label>
        <Textarea
          id="description"
          placeholder="Describe your server..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {description.length}/500 characters
        </p>
      </div>
    </div>
  );
}
