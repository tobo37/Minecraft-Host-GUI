import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useState } from "react";

interface WelcomePageProps {
  onServerCreated: (serverPath: string) => void;
}

export function WelcomePage({ onServerCreated }: WelcomePageProps) {
  const { translations } = useLanguage();
  const [isCreating, setIsCreating] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);

  const handleCreateServer = async () => {
    setIsCreating(true);
    setServerStatus(null);
    
    try {
      // Längerer Timeout für Server-Erstellung (60 Sekunden)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch('/api/create-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.status === 'success') {
          setServerStatus(`✅ ${translations.messages.serverCreating} (${data.serverPath})`);
          // Nach kurzer Verzögerung direkt zur Server-Seite wechseln
          setTimeout(() => {
            onServerCreated(data.serverPath);
          }, 1500);
        } else if (data.status === 'exists') {
          setServerStatus(`ℹ️ ${translations.messages.serverExists} (${data.serverPath})`);
          setTimeout(() => {
            onServerCreated(data.serverPath);
          }, 1500);
        }
      } else {
        console.error('Server creation failed:', data);
        setServerStatus(`❌ ${translations.messages.serverError}: ${data.message || 'Unbekannter Fehler'}`);
        if (data.error) {
          console.error('Detailed error:', data.error);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setServerStatus(`❌ ${translations.messages.serverError}: Timeout nach 60 Sekunden`);
      } else {
        setServerStatus(`❌ ${translations.messages.serverError}`);
      }
      console.error('Fehler:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm"></div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {translations.title}
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground max-w-md mx-auto">
              {translations.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            <div className="grid gap-4 text-left">
              <h3 className="font-semibold text-foreground mb-2">{translations.features.title}</h3>
              <div className="grid gap-3">
                {translations.features.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4 pt-4">
              <Button 
                onClick={handleCreateServer}
                disabled={isCreating}
                size="lg" 
                className="text-lg px-12 py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    {translations.messages.serverCreating}
                  </div>
                ) : (
                  translations.startButton
                )}
              </Button>
              
              {serverStatus && (
                <div className="text-sm text-center max-w-md">
                  {serverStatus}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}