import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import type { Server } from "@/services/types";

interface RenameDialogProps {
  open: boolean;
  serverInfo: Server | null;
  projectPath: string;
  newName: string;
  validationError: string;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function RenameDialog({
  open,
  serverInfo,
  projectPath,
  newName,
  validationError,
  onOpenChange,
  onNameChange,
  onSave,
  onCancel,
}: RenameDialogProps) {
  const { translations } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {translations.serverManagement.renameDialog.title}
          </DialogTitle>
          <DialogDescription>
            {translations.serverManagement.renameDialog.currentName}:{" "}
            {serverInfo?.customName || serverInfo?.name || projectPath}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newName">
              {translations.serverManagement.renameDialog.newNameLabel}
            </Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter new server name"
              maxLength={100}
            />
            {validationError && (
              <p className="text-sm text-red-500">{validationError}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {translations.serverManagement.renameDialog.cancel}
          </Button>
          <Button onClick={onSave}>
            {translations.serverManagement.renameDialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
