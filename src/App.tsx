import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import "./index.css";

export function App() {
  const { language, translations, toggleLanguage } = useLanguage();

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
        console.log(translations.messages.serverCreating);
      } else {
        console.error(translations.messages.serverError);
      }
    } catch (error) {
      console.error('Fehler:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="font-mono text-xs"
        >
          {language.toUpperCase()}
        </Button>
      </div>

      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-primary rounded-sm"></div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text">
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
            
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleCreateServer}
                size="lg" 
                className="text-lg px-12 py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                {translations.startButton}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
