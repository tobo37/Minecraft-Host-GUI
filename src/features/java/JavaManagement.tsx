import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/useLanguage";
import { useJavaInfo } from "./useJavaInfo";
import { useJabbaInstall } from "./useJabbaInstall";
import { JavaInfo } from "./JavaInfo";
import { JabbaInstall } from "./JabbaInstall";
import { JavaVersionSelector } from "./JavaVersionSelector";

interface JavaManagementProps {
  onBack: () => void;
}

export function JavaManagement({ onBack }: JavaManagementProps) {
  const { translations } = useLanguage();
  const { javaInfo, jabbaInfo, loading, error, refresh } = useJavaInfo();
  const {
    installing,
    switching,
    error: installError,
    installJabba,
    installVersion,
    switchVersion,
  } = useJabbaInstall(refresh);

  const displayError = error || installError;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Button variant="outline" onClick={onBack}>
            ← {translations.javaManagement.back}
          </Button>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur">
          <CardHeader className="text-center relative">
            <CardTitle className="text-3xl font-bold">
              ☕ {translations.javaManagement.title}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="absolute top-4 right-4"
            >
              🔄 {translations.javaManagement.refresh}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
            {displayError && (
              <Alert variant="destructive">
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            <JavaInfo javaInfo={javaInfo} />

            <Card>
              <CardHeader>
                <CardTitle>{translations.javaManagement.jabbaTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                {!jabbaInfo?.installed ? (
                  <JabbaInstall
                    installing={installing}
                    onInstall={installJabba}
                    jabbaInfo={jabbaInfo}
                  />
                ) : (
                  <JavaVersionSelector
                    jabbaInfo={jabbaInfo}
                    installing={installing}
                    switching={switching}
                    onInstallVersion={installVersion}
                    onSwitchVersion={switchVersion}
                  />
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
