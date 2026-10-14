import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useConfigFiles } from "./useConfigFiles";
import { ConfigFileList } from "./ConfigFileList";
import { ConfigEditor } from "./ConfigEditor";
import { KnownPlayers } from "./KnownPlayers";
import type { ServerStatus } from "@/services/types";

interface ConfigurationManagementProps {
  projectPath: string;
  serverStatus?: ServerStatus;
  backHref: string;
}

export function ConfigurationManagement({
  projectPath,
  serverStatus,
  backHref,
}: ConfigurationManagementProps) {
  const {
    configFiles,
    selectedConfig,
    configContent,
    isLoading,
    isSaving,
    saveError,
    loadConfigFiles,
    selectConfig,
    reloadSelectedConfig,
    updateContent,
    saveConfig,
  } = useConfigFiles(projectPath);

  return (
    <div className="app-page p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-4">
          <Button asChild variant="outline" className="mb-4">
            <Link href={backHref}>← Zurück zur Serververwaltung</Link>
          </Button>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 text-primary">⚙️</div>
            </div>
            <CardTitle className="text-3xl font-bold text-primary">
              Konfiguration
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Projekt: {projectPath}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <ConfigFileList
                  configFiles={configFiles}
                  selectedConfig={selectedConfig}
                  onSelectConfig={selectConfig}
                />
              </div>

              <div className="lg:col-span-2">
                <ConfigEditor
                  selectedConfig={selectedConfig}
                  configContent={configContent}
                  isLoading={isLoading}
                  isSaving={isSaving}
                  saveError={saveError}
                  onContentChange={updateContent}
                  onSave={saveConfig}
                />
              </div>
            </div>

            <KnownPlayers
              projectPath={projectPath}
              serverStatus={serverStatus}
              onFileChanged={(fileName) => {
                // Reload the editor so it does not show (and later save) stale content
                if (selectedConfig?.name === fileName) reloadSelectedConfig();
                loadConfigFiles();
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
