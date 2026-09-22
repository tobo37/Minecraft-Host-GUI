import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModpackImport } from "./useModpackImport";

interface ServerLinkImportProps {
  onImported: (filename: string, modpackInfo?: { name: string; version: string }) => void;
  onError: (message: string) => void;
}

const RELEASE_TYPE_LABEL: Record<string, string> = {
  release: "Release",
  beta: "Beta",
  alpha: "Alpha",
};

export function ServerLinkImport({ onImported, onError }: ServerLinkImportProps) {
  const [url, setUrl] = useState("");
  const {
    isResolving,
    isImporting,
    resolved,
    selectedVersionId,
    setSelectedVersionId,
    resolveLink,
    importDirectUrl,
    importSelectedVersion,
    reset,
  } = useModpackImport();

  const isBusy = isResolving || isImporting;

  const handleCheckLink = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      onError("Bitte einen Link eingeben");
      return;
    }

    const { recognized, error } = await resolveLink(trimmed);

    if (error) {
      onError(error);
      return;
    }

    if (!recognized) {
      // Not a known modpack project link — treat it as a direct download URL.
      const result = await importDirectUrl(trimmed);
      if (result.success && result.filename) {
        onImported(result.filename);
        setUrl("");
      } else {
        onError(result.error || "Import fehlgeschlagen");
      }
    }
  };

  const handleImportVersion = async () => {
    const result = await importSelectedVersion();
    if (result.success && result.filename) {
      onImported(result.filename, result.modpackInfo);
      setUrl("");
      reset();
    } else {
      onError(result.error || "Import fehlgeschlagen");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Server per Link importieren</h3>

      <div className="space-y-2">
        <Label htmlFor="modpack-link" className="text-sm font-medium">
          CurseForge-Modpack-Link oder Direkt-Download-URL
        </Label>
        <div className="flex gap-2">
          <Input
            id="modpack-link"
            type="url"
            placeholder="https://www.curseforge.com/minecraft/modpacks/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isBusy}
            className="flex-1"
          />
          <Button onClick={handleCheckLink} disabled={isBusy || !url.trim()}>
            {isResolving ? "Prüfe..." : "Link verwenden"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Bei einem CurseForge-Modpack-Link kannst du danach eine Version auswählen. Bei allen
          anderen Links wird die Datei direkt heruntergeladen.
        </p>
      </div>

      {resolved && (
        <div className="space-y-3 rounded-lg border border-muted-foreground/25 p-4">
          <p className="text-sm font-medium">{resolved.name}</p>

          <div className="space-y-2">
            <Label htmlFor="modpack-version" className="text-sm font-medium">
              Version
            </Label>
            <Select
              value={selectedVersionId !== null ? String(selectedVersionId) : undefined}
              onValueChange={(value) => setSelectedVersionId(Number(value))}
            >
              <SelectTrigger id="modpack-version">
                <SelectValue placeholder="Wähle eine Version..." />
              </SelectTrigger>
              <SelectContent>
                {resolved.versions.map((version, index) => (
                  <SelectItem key={version.id} value={String(version.id)}>
                    <div className="flex flex-col">
                      <span>
                        {version.displayName}
                        {index === 0 ? " (latest)" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {version.gameVersion} • {RELEASE_TYPE_LABEL[version.releaseType]} •{" "}
                        {new Date(version.fileDate).toLocaleDateString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleImportVersion}
            disabled={isImporting || selectedVersionId === null}
            className="w-full"
          >
            {isImporting ? "Wird importiert..." : "Diese Version importieren"}
          </Button>
        </div>
      )}

      {isImporting && !resolved && (
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Wird heruntergeladen...
        </div>
      )}
    </div>
  );
}
