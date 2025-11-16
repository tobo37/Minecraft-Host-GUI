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
import { useDeleteValidation } from "./useDeleteValidation";
import type { Server } from "@/services/types";

interface DeleteDialogProps {
  open: boolean;
  serverInfo: Server | null;
  projectPath: string;
  confirmName: string;
  validationError: string;
  onOpenChange: (_open: boolean) => void;
  onConfirmNameChange: (_value: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

function getServerDisplayName(serverInfo: Server | null, projectPath: string): string {
  return serverInfo?.customName || serverInfo?.name || projectPath;
}

export function DeleteDialog({
  open,
  serverInfo,
  projectPath,
  confirmName,
  validationError,
  onOpenChange,
  onConfirmNameChange,
  onDelete,
  onCancel,
}: DeleteDialogProps) {
  const { translations } = useLanguage();
  
  const serverName = getServerDisplayName(serverInfo, projectPath);
  const { error: localError, clearError } = useDeleteValidation({
    serverName,
    confirmName,
    validationErrorMessage: translations.serverManagement.deleteDialog.validationError,
  });

  const displayError = validationError || localError;

  const handleConfirmNameChange = (value: string) => {
    clearError();
    onConfirmNameChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {translations.serverManagement.deleteDialog.title}
          </DialogTitle>
          <DialogDescription>
            {translations.serverManagement.deleteDialog.warning}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {translations.serverManagement.deleteDialog.serverInfo}
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="font-semibold">
                {serverName}
              </p>
              <p className="text-sm text-muted-foreground">{projectPath}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deleteConfirm">
              {translations.serverManagement.deleteDialog.confirmLabel}
            </Label>
            <Input
              id="deleteConfirm"
              value={confirmName}
              onChange={(e) => handleConfirmNameChange(e.target.value)}
              placeholder={
                translations.serverManagement.deleteDialog.confirmPlaceholder
              }
            />
            {displayError && (
              <p className="text-sm text-red-500">{displayError}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {translations.serverManagement.deleteDialog.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            {translations.serverManagement.deleteDialog.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
