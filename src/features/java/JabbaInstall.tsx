import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";
import type { JabbaInfo } from "@/services/javaService";

interface JabbaInstallProps {
  installing: boolean;
  onInstall: () => void;
  jabbaInfo?: JabbaInfo | null;
}

import type { Translations } from "@/lib/i18n";

function JabbaInstructions({ translations }: { translations: Translations }) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>ℹ️ {translations.javaManagement.jabbaNotAvailable}</AlertDescription>
      </Alert>
      <div className="space-y-3">
        <p className="text-muted-foreground">
          {translations.javaManagement.jabbaInstallInstructions}
        </p>
        <a
          href="https://github.com/shyiko/jabba#installation"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          🔗 {translations.javaManagement.jabbaInstallLink}
        </a>
        <Alert variant="default" className="mt-4">
          <AlertDescription>✓ {translations.javaManagement.systemJavaFallback}</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export function JabbaInstall({ installing, onInstall, jabbaInfo }: JabbaInstallProps) {
  const { translations } = useLanguage();
  const showInstructions = jabbaInfo?.isDockerEnvironment === false && !jabbaInfo?.installed;

  if (showInstructions) {
    return <JabbaInstructions translations={translations} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">{translations.javaManagement.jabbaDescription}</p>
      <Alert>
        <AlertDescription>💡 {translations.javaManagement.installNote}</AlertDescription>
      </Alert>
      <Button onClick={onInstall} disabled={installing} className="w-full" size="lg">
        {installing
          ? translations.javaManagement.installing
          : translations.javaManagement.installJabba}
      </Button>
    </div>
  );
}
