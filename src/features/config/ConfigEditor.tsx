import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfigFile } from "./useConfigFiles";

interface ConfigEditorProps {
  selectedConfig: ConfigFile | null;
  configContent: string;
  isLoading: boolean;
  isSaving: boolean;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

export function ConfigEditor({
  selectedConfig,
  configContent,
  isLoading,
  isSaving,
  onContentChange,
  onSave,
}: ConfigEditorProps) {
  const renderHelpText = () => {
    if (!selectedConfig) return null;

    if (selectedConfig.name === 'user_jvm_args.txt') {
      return (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
          <strong>JVM-Argumente:</strong>
          <br />• -Xms: Minimaler RAM (z.B. -Xms4G für 4GB)
          <br />• -Xmx: Maximaler RAM (z.B. -Xmx8G für 8GB)
          <br />• Weitere Optimierungen für bessere Performance
        </div>
      );
    }

    if (selectedConfig.name === 'eula.txt') {
      return (
        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">
          <strong>EULA (End User License Agreement):</strong>
          <br />• Setze "eula=true" um die Minecraft EULA zu akzeptieren
          <br />• Der Server startet nur mit akzeptierter EULA
          <br />• Lies die EULA unter: https://account.mojang.com/documents/minecraft_eula
        </div>
      );
    }

    if (selectedConfig.name === 'server.properties') {
      return (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
          <strong>Server-Eigenschaften:</strong>
          <br />• server-port: Port des Servers (Standard: 25565)
          <br />• gamemode: Spielmodus (survival, creative, adventure, spectator)
          <br />• difficulty: Schwierigkeit (peaceful, easy, normal, hard)
          <br />• max-players: Maximale Spieleranzahl
          <br />• white-list: Whitelist aktivieren (true/false)
        </div>
      );
    }

    if (selectedConfig.name.endsWith('.json')) {
      return (
        <div className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded">
          <strong>JSON-Datei:</strong>
          <br />• Achte auf korrekte JSON-Syntax
          <br />• Verwende doppelte Anführungszeichen für Strings
          <br />• Keine Kommas nach dem letzten Element
          <br />• Teste die Syntax vor dem Speichern
        </div>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            {selectedConfig ? selectedConfig.name : 'Datei auswählen'}
          </CardTitle>
          {selectedConfig && (
            <Button 
              onClick={onSave}
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
              onChange={(e) => onContentChange(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder={isLoading ? "Lade Konfiguration..." : "Konfiguration bearbeiten..."}
              disabled={isLoading}
            />
            {renderHelpText()}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <div className="text-4xl mb-4">📄</div>
            <div>Wähle eine Konfigurationsdatei aus der Liste aus</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
