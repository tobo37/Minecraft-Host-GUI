import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Server } from "@/services/types";

interface StartFileCandidate {
  path: string;
  name: string;
  confidence: "high" | "medium" | "low";
  isExecutable: boolean;
  size: number;
}

interface StartFileDialogProps {
  open: boolean;
  serverInfo: Server | null;
  candidates: StartFileCandidate[];
  selectedFile: string;
  isSearching: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFile: (path: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StartFileDialog({
  open,
  serverInfo,
  candidates,
  selectedFile,
  isSearching,
  onOpenChange,
  onSelectFile,
  onConfirm,
  onCancel,
}: StartFileDialogProps) {
  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-100 text-green-800 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🔍 Startdatei suchen</DialogTitle>
          <DialogDescription>
            Wähle die richtige Startdatei für dein Modpack. Die Datei wird beim
            nächsten Start verwendet.
          </DialogDescription>
        </DialogHeader>

        {isSearching ? (
          <div className="py-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Durchsuche Server-Dateien...
            </p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Keine Startdateien gefunden.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Stelle sicher, dass dein Server korrekt entpackt wurde.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Gefundene Startdateien ({candidates.length})
              </Label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.path}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFile === candidate.path
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => onSelectFile(candidate.path)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium truncate">
                            {candidate.name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceBadgeColor(
                              candidate.confidence
                            )}`}
                          >
                            {candidate.confidence === "high" && "Empfohlen"}
                            {candidate.confidence === "medium" && "Möglich"}
                            {candidate.confidence === "low" &&
                              "Unwahrscheinlich"}
                          </span>
                          {candidate.isExecutable && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                              Ausführbar
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {candidate.path}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(candidate.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {selectedFile === candidate.path && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {serverInfo?.startFile && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-1">
                  Aktuelle Startdatei:
                </p>
                <p className="text-xs font-mono">{serverInfo.startFile}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!selectedFile || isSearching}
          >
            Startdatei festlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
