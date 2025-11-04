import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from "react";

interface ConfigurationManagementProps {
  projectPath: string;
  onBack: () => void;
}

interface ConfigFile {
  name: string;
  path: string;
  description: string;
}

export function ConfigurationManagement({ projectPath, onBack }: ConfigurationManagementProps) {
  const { translations } = useLanguage();
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ConfigFile | null>(null);
  const [configContent, setConfigContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfigFiles();
  }, [projectPath]);

  const loadConfigFiles = async () => {
    try {
      const response = await fetch(`/api/config/list?project=${encodeURIComponent(projectPath)}`);
      const data = await response.json();
      
      if (data.success) {
        setConfigFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading config files:', error);
    }
  };

  const loadConfigContent = async (configFile: ConfigFile) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/config/read?project=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(configFile.name)}`);
      const data = await response.json();
      
      if (data.success) {
        setConfigContent(data.content);
        setSelectedConfig(configFile);
      }
    } catch (error) {
      console.error('Error loading config content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfigContent = async () => {
    if (!selectedConfig) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: projectPath,
          file: selectedConfig.name,
          content: configContent
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Show success message or toast
        console.log('Config saved successfully');
      }
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
              {/* Config File List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Konfigurationsdateien</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {configFiles.map((file) => (
                      <Button
                        key={file.name}
                        variant={selectedConfig?.name === file.name ? "default" : "outline"}
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => loadConfigContent(file)}
                      >
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {file.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                    
                    {configFiles.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        Keine Konfigurationsdateien gefunden
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Config Editor */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        {selectedConfig ? selectedConfig.name : 'Datei auswählen'}
                      </CardTitle>
                      {selectedConfig && (
                        <Button 
                          onClick={saveConfigContent}
                          disabled={isSaving}
                          size="sm"
                        >
                          {isSaving ? 'Speichern...' : 'Speichern'}
                        </Button>
                      )}
                    </div>
                    {selectedConfig && (
                      <CardDescription>
                        {selectedConfig.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {selectedConfig ? (
                      <div className="space-y-4">
                        <Textarea
                          value={configContent}
                          onChange={(e) => setConfigContent(e.target.value)}
                          className="min-h-[400px] font-mono text-sm"
                          placeholder={isLoading ? "Lade Konfiguration..." : "Konfiguration bearbeiten..."}
                          disabled={isLoading}
                        />
                        
                        {selectedConfig.name === 'user_jvm_args.txt' && (
                          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                            <strong>Hinweis:</strong> Diese Datei enthält JVM-Argumente für den Minecraft-Server.
                            <br />• -Xms: Minimaler RAM (z.B. -Xms4G für 4GB)
                            <br />• -Xmx: Maximaler RAM (z.B. -Xmx8G für 8GB)
                            <br />• Weitere Optimierungen für bessere Performance
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        <div className="text-4xl mb-4">📄</div>
                        <div>Wähle eine Konfigurationsdatei aus der Liste aus</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}