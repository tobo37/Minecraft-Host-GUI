import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { JabbaInfo } from "./useJavaInfo";
import type { Translations } from "@/lib/i18n";

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
  "zulu@1.8.282",
];

interface VersionItemProps {
  version: string;
  isInstalled: boolean;
  isActive: boolean;
  installing: boolean;
  switching: boolean;
  translations: Translations;
  onInstall: () => void;
  onSwitch: () => void;
}

function VersionItem({
  version,
  isInstalled,
  isActive,
  installing,
  switching,
  translations,
  onInstall,
  onSwitch,
}: VersionItemProps) {
  return (
    <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        <span
          className={`text-lg ${
            isInstalled ? "text-green-600" : "text-muted-foreground"
          }`}
        >
          {isInstalled ? "✓" : "○"}
        </span>
        <span className="font-mono text-sm">{version}</span>
      </div>
      {isActive ? (
        <span className="text-xs text-green-600 font-semibold px-3 py-1 bg-green-50 rounded">
          {translations.javaManagement.active}
        </span>
      ) : isInstalled ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onSwitch}
          disabled={switching}
        >
          {translations.javaManagement.use}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onInstall}
          disabled={installing}
        >
          {translations.javaManagement.install}
        </Button>
      )}
    </div>
  );
}

interface InstalledVersionsListProps {
  versions: string[];
  currentVersion?: string;
  switching: boolean;
  translations: Translations;
  onSwitch: (_version: string) => void;
}

function InstalledVersionsList({
  versions,
  currentVersion,
  switching,
  translations,
  onSwitch,
}: InstalledVersionsListProps) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold">
        {translations.javaManagement.availableVersions}
      </h4>
      <div className="grid gap-2 max-h-96 overflow-y-auto">
        {versions.map((version) => (
          <div
            key={version}
            className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="font-mono text-sm">{version}</span>
            {version === currentVersion ? (
              <span className="text-xs text-green-600 font-semibold">
                {translations.javaManagement.active}
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSwitch(version)}
                disabled={switching}
              >
                {translations.javaManagement.use}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RecommendedVersionsProps {
  jabbaInfo: JabbaInfo;
  installing: boolean;
  switching: boolean;
  translations: Translations;
  onInstall: (_version: string) => void;
  onSwitch: (_version: string) => void;
}

function RecommendedVersions({
  jabbaInfo,
  installing,
  switching,
  translations,
  onInstall,
  onSwitch,
}: RecommendedVersionsProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">
        {translations.javaManagement.recommendedVersions}
      </h4>
      <div className="grid gap-2">
        {RECOMMENDED_VERSIONS.map((version) => (
          <VersionItem
            key={version}
            version={version}
            isInstalled={jabbaInfo.versions?.includes(version) || false}
            isActive={version === jabbaInfo.current}
            installing={installing}
            switching={switching}
            translations={translations}
            onInstall={() => onInstall(version)}
            onSwitch={() => onSwitch(version)}
          />
        ))}
      </div>
    </div>
  );
}

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
          <span className="font-mono font-semibold">{jabbaInfo.current}</span>
        </div>
      )}

      <RecommendedVersions
        jabbaInfo={jabbaInfo}
        installing={installing}
        switching={switching}
        translations={translations}
        onInstall={onInstallVersion}
        onSwitch={onSwitchVersion}
      />

      {jabbaInfo.versions && jabbaInfo.versions.length > 0 && (
        <InstalledVersionsList
          versions={jabbaInfo.versions}
          currentVersion={jabbaInfo.current}
          switching={switching}
          translations={translations}
          onSwitch={onSwitchVersion}
        />
      )}
    </div>
  );
}
