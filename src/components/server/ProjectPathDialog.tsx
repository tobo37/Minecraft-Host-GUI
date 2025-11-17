import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import type { DirectoryNode } from "@/services/directoryBrowserClient";
import { browseServerDirectory } from "@/services/directoryBrowserClient";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DirectoryTree } from "./DirectoryTree";

interface ProjectPathDialogProps {
  isOpen: boolean;
  projectPath: string;
  serverProject: string;
  validationError: string;
  onProjectPathChange: (path: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ProjectPathDialog({
  isOpen,
  projectPath,
  serverProject,
  validationError,
  onProjectPathChange,
  onSave,
  onClose,
}: ProjectPathDialogProps) {
  const { translations } = useLanguage();
  const [directoryTree, setDirectoryTree] = useState<DirectoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadDirectoryTree();
    }
  }, [isOpen, serverProject]);

  const loadDirectoryTree = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await browseServerDirectory(serverProject);
      if (response.success && response.tree) {
        setDirectoryTree(response.tree);
      } else {
        setError(response.error || "Failed to load directory structure");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPath = (path: string) => {
    onProjectPathChange(path);
  };

  const handleClearPath = () => {
    onProjectPathChange("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {translations.serverManagement.projectPathDialog?.title ||
              "Set Project Path"}
          </DialogTitle>
          <DialogDescription>
            {translations.serverManagement.projectPathDialog?.description ||
              "Select the folder where your server files (startserver.sh, server.properties) are located. Click on a folder to select it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label>
              {translations.serverManagement.projectPathDialog?.label ||
                "Selected Path"}
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                {projectPath || "(Root directory)"}
              </div>
              {projectPath && (
                <Button variant="outline" size="sm" onClick={handleClearPath}>
                  Clear
                </Button>
              )}
            </div>
            {validationError && (
              <p className="text-sm text-red-500">{validationError}</p>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col border rounded-md">
            <div className="px-3 py-2 bg-muted border-b">
              <p className="text-sm font-medium">Folder Structure</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-sm text-red-500 p-4 text-center">
                  {error}
                </div>
              ) : (
                <DirectoryTree
                  nodes={directoryTree}
                  selectedPath={projectPath}
                  onSelectPath={handleSelectPath}
                />
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            💡 Tip: Look for folders containing startserver.sh or
            server.properties
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translations.common?.cancel || "Cancel"}
          </Button>
          <Button onClick={onSave}>
            {translations.common?.save || "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
