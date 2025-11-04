import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from "react";

interface Server {
  name: string;
  path: string;
  createdAt: string;
}

interface ProjectSelectionProps {
  onSelectProject: (projectPath: string) => void;
  onCreateNew: () => void;
}

export function ProjectSelection({ onSelectProject, onCreateNew }: ProjectSelectionProps) {
  const { translations } = useLanguage();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm"></div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {translations.projectSelection.title}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {translations.projectSelection.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex justify-center mb-6">
              <Button 
                onClick={onCreateNew}
                size="lg"
                className="px-8 py-3"
              >
                {translations.projectSelection.createNew}
              </Button>
            </div>

            {servers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {translations.projectSelection.noProjects}
              </div>
            ) : (
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold text-center mb-4">
                  {translations.projectSelection.selectProject}
                </h3>
                {servers.map((server) => (
                  <Card 
                    key={server.path}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => onSelectProject(server.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-lg">{server.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Erstellt: {formatDate(server.createdAt)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Auswählen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}