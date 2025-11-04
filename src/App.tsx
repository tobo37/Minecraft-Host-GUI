import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import "./index.css";

export function App() {
  const handleCreateServer = async () => {
    try {
      // TODO: Backend-Funktion "create server" wird hier implementiert
      const response = await fetch('/api/create-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('Server wird erstellt...');
      } else {
        console.error('Fehler beim Erstellen des Servers');
      }
    } catch (error) {
      console.error('Fehler:', error);
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
              Minecraft Server Manager
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground max-w-md mx-auto">
              Erstelle und verwalte deinen eigenen Minecraft Server mit nur einem Klick. 
              Unser System kümmert sich um die komplette Einrichtung und Konfiguration.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            <div className="grid gap-4 text-left">
              <h3 className="font-semibold text-foreground mb-2">Mit unserem Service kannst du:</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span>Einen Minecraft Server in Sekunden erstellen</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span>Automatische Konfiguration und Setup</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span>Einfache Verwaltung über das Web-Interface</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleCreateServer}
                size="lg" 
                className="text-lg px-12 py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                Jetzt starten
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
