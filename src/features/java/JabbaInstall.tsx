import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";

interface JabbaInstallProps {
  installing: boolean;
  onInstall: () => void;
}

export function JabbaInstall({ installing, onInstall }: JabbaInstallProps) {
  const { translations } = useLanguage();

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        {translations.javaManagement.jabbaDescription}
      </p>
      <Alert>
        <AlertDescription>
          💡 {translations.javaManagement.installNote}
        </AlertDescription>
      </Alert>
      <Button
        onClick={onInstall}
        disabled={installing}
        className="w-full"
        size="lg"
      >
        {installing
          ? translations.javaManagement.installing
          : translations.javaManagement.installJabba}
      </Button>
    </div>
  );
}
