import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConfigFile } from "./useConfigFiles";

interface ConfigFileListProps {
  configFiles: ConfigFile[];
  selectedConfig: ConfigFile | null;
  onSelectConfig: (_file: ConfigFile) => void;
}

export function ConfigFileList({ 
  configFiles, 
  selectedConfig, 
  onSelectConfig 
}: ConfigFileListProps) {
  const groupedFiles = configFiles.reduce((groups, file) => {
    const category = file.category || 'Andere';
    if (!groups[category]) groups[category] = [];
    groups[category].push(file);
    return groups;
  }, {} as Record<string, ConfigFile[]>);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Konfigurationsdateien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(groupedFiles).map(([category, files]) => (
            <div key={category} className="space-y-2">
              <div className="text-sm font-semibold text-muted-foreground px-2">
                {category}
              </div>
              {files.map((file) => (
                <Tooltip key={file.name}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedConfig?.name === file.name ? "default" : "outline"}
                      className={`w-full justify-start text-left h-auto p-3 ${
                        !file.enabled 
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 hover:bg-gray-100' 
                          : ''
                      }`}
                      onClick={() => onSelectConfig(file)}
                      disabled={!file.enabled}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium">{file.name}</span>
                        {!file.exists && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Nicht vorhanden
                          </span>
                        )}
                        {file.exists && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Verfügbar
                          </span>
                        )}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>{file.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
          
          {configFiles.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              Keine Konfigurationsdateien gefunden
            </div>
          )}
          
          {configFiles.some(f => !f.exists) && (
            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded mt-4">
              💡 <strong>Hinweis:</strong> Einige Dateien werden erst nach dem ersten Serverstart erstellt.
              Starte den Server einmal, um alle Konfigurationsdateien zu generieren.
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
