import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfigFiles } from "./useConfigFiles";
import { ConfigFileList } from "./ConfigFileList";
import { ConfigEditor } from "./ConfigEditor";

interface ConfigurationManagementProps {
  projectPath: string;
  onBack: () => void;
}

export function ConfigurationManagement({ projectPath, onBack }: ConfigurationManagementProps) {
  const {
    configFiles,
    selectedConfig,
    configContent,
    isLoading,
    isSaving,
    selectConfig,
    updateContent,
    saveConfig,
  } = useConfigFiles(projectPath);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mb-4"
          >
            ← Zurück zur Serververwaltung
          </Button>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 text-primary">⚙️</div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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
                  onContentChange={updateContent}
                  onSave={saveConfig}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
