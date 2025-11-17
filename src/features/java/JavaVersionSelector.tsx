import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";
import type { JabbaInfo } from "./useJavaInfo";

interface JavaVersionSelectorProps {
  jabbaInfo: JabbaInfo | null;
  installing: boolean;
  switching: boolean;
  onInstallVersion: (_version: string) => void;
  onSwitchVersion: (_version: string) => void;
}

const RECOMMENDED_VERSIONS = [
  "openjdk@1.17.0",
  "openjdk@1.16.0",
  "adopt@1.11.0-11",
  "zulu@1.8.282"
];

export function JavaVersionSelector({
  jabbaInfo,
  installing,
  switching,
  onInstallVersion,
  onSwitchVersion,
}: JavaVersionSelectorProps) {
  const { translations } = useLanguage();

  if (!jabbaInfo?.installed) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
        <span className="text-muted-foreground">
          {translations.javaManagement.jabbaInstalled}
        </span>
        <span className="text-green-600 font-semibold">✓</span>
      </div>

      {jabbaInfo.current && (
        <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
          <span className="text-muted-foreground">
            {translations.javaManagement.currentVersion}:
          </span>
          <span className="font-mono font-semibold">
            {jabbaInfo.current}
          </span>
        </div>
      )}

      {(!jabbaInfo.versions || jabbaInfo.versions.length === 0) && (
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              {translations.javaManagement.noVersionsInstalled}
            </AlertDescription>
          </Alert>
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              {translations.javaManagement.recommendedVersions}
            </p>
            {RECOMMENDED_VERSIONS.map((version) => (
              <Button
                key={version}
                variant="outline"
                onClick={() => onInstallVersion(version)}
                disabled={installing}
                className="justify-between"
              >
                <span className="font-mono text-sm">{version}</span>
                <span className="text-xs">
                  {translations.javaManagement.install}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {jabbaInfo.versions && jabbaInfo.versions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">
            {translations.javaManagement.availableVersions}
          </h4>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {jabbaInfo.versions.map((version) => (
              <div
                key={version}
                className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="font-mono text-sm">
                  {version}
                </span>
                {version === jabbaInfo.current ? (
                  <span className="text-xs text-green-600 font-semibold">
                    {translations.javaManagement.active}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSwitchVersion(version)}
                    disabled={switching}
                  >
                    {translations.javaManagement.use}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
