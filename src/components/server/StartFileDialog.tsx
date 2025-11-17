import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StartFileList } from "./StartFileList";
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
        ) : (
          <>
            <StartFileList
              candidates={candidates}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />

            {serverInfo?.startFile && candidates.length > 0 && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-1">
                  Aktuelle Startdatei:
                </p>
                <p className="text-xs font-mono">{serverInfo.startFile}</p>
              </div>
            )}
          </>
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
