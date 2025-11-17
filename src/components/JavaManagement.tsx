import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JavaManagementProps {
  onBack: () => void;
}

interface JavaInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

interface JabbaInfo {
  installed: boolean;
  versions?: string[];
  current?: string;
}

export function JavaManagement({ onBack }: JavaManagementProps) {
  const { translations } = useLanguage();
  const [javaInfo, setJavaInfo] = useState<JavaInfo | null>(null);
  const [jabbaInfo, setJabbaInfo] = useState<JabbaInfo | null>(null);
  const [_availableVersions, setAvailableVersions] = useState<string[]>([]); // TODO: Implement version listing
  const [_showAllVersions, _setShowAllVersions] = useState(false); // TODO: Implement version filtering
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJavaInfo();
  }, []);

  const fetchJavaInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const [javaRes, jabbaRes] = await Promise.all([
        fetch("/api/java/info"),
        fetch("/api/java/jabba/info"),
      ]);

      const javaData = await javaRes.json();
      const jabbaData = await jabbaRes.json();

      setJavaInfo(javaData);
      setJabbaInfo(jabbaData);

      // If Jabba is installed but no versions, fetch available versions
      if (jabbaData.installed && (!jabbaData.versions || jabbaData.versions.length === 0)) {
        fetchAvailableVersions();
      }
    } catch (err) {
      setError("Failed to fetch Java information");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVersions = async () => {
    try {
      const response = await fetch("/api/java/jabba/ls-remote");
      const data = await response.json();
      
      if (data.success && data.versions) {
        setAvailableVersions(data.versions);
      }
    } catch (err) {
      console.error("Failed to fetch available versions:", err);
    }
  };

  const handleInstallJabba = async () => {
    setInstalling(true);
    setError(null);
    try {
      const response = await fetch("/api/java/jabba/install", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        // Wait a bit for the installation to complete and environment to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchJavaInfo();
      } else {
        setError(data.error || "Failed to install Jabba");
      }
    } catch (err) {
      setError("Failed to install Jabba");
      console.error(err);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallVersion = async (version: string) => {
    setInstalling(true);
    setError(null);
    try {
      const response = await fetch("/api/java/jabba/install-version", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchJavaInfo();
      } else {
        setError(data.error || "Failed to install Java version");
      }
    } catch (err) {
      setError("Failed to install Java version");
      console.error(err);
    } finally {
      setInstalling(false);
    }
  };

  const handleSwitchVersion = async (version: string) => {
    setSwitching(true);
    setError(null);
    try {
      const response = await fetch("/api/java/jabba/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchJavaInfo();
      } else {
        setError(data.error || "Failed to switch Java version");
      }
    } catch (err) {
      setError("Failed to switch Java version");
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

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
              onClick={fetchJavaInfo}
              disabled={loading}
              className="absolute top-4 right-4"
            >
              🔄 {translations.javaManagement.refresh}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Java Info */}
            <Card>
              <CardHeader>
                <CardTitle>{translations.javaManagement.currentJava}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {javaInfo?.installed ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {translations.javaManagement.version}:
                      </span>
                      <span className="font-mono font-semibold">
                        {javaInfo.version}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {translations.javaManagement.path}:
                      </span>
                      <span className="font-mono text-sm text-muted-foreground truncate max-w-md">
                        {javaInfo.path}
                      </span>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      {translations.javaManagement.noJava}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Jabba Section */}
            <Card>
              <CardHeader>
                <CardTitle>{translations.javaManagement.jabbaTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!jabbaInfo?.installed ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      {translations.javaManagement.jabbaDescription}
                    </p>
                    <Alert>
                      <AlertDescription>
                        💡 {translations.javaManagement.installNote}
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleInstallJabba}
                      disabled={installing}
                      className="w-full"
                      size="lg"
                    >
                      {installing
                        ? translations.javaManagement.installing
                        : translations.javaManagement.installJabba}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">
                        {translations.javaManagement.jabbaInstalled}
                      </span>
                      <span className="text-green-600 font-semibold">✓</span>
                    </div>

                    {jabbaInfo.current && (
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <span className="text-muted-foreground">
                          {translations.javaManagement.currentVersion}:
                        </span>
                        <span className="font-mono font-semibold">
                          {jabbaInfo.current}
                        </span>
                      </div>
                    )}

                    {(!jabbaInfo.versions || jabbaInfo.versions.length === 0) && (
                      <div className="space-y-3">
                        <Alert>
                          <AlertDescription>
                            {translations.javaManagement.noVersionsInstalled}
                          </AlertDescription>
                        </Alert>
                        <div className="grid gap-2">
                          <p className="text-sm text-muted-foreground">
                            {translations.javaManagement.recommendedVersions}
                          </p>
                          {["openjdk@1.17.0", "openjdk@1.16.0", "adopt@1.11.0-11", "zulu@1.8.282"].map((version) => (
                            <Button
                              key={version}
                              variant="outline"
                              onClick={() => handleInstallVersion(version)}
                              disabled={installing}
                              className="justify-between"
                            >
                              <span className="font-mono text-sm">{version}</span>
                              <span className="text-xs">
                                {translations.javaManagement.install}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {jabbaInfo.versions && jabbaInfo.versions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">
                          {translations.javaManagement.availableVersions}
                        </h4>
                        <div className="grid gap-2 max-h-96 overflow-y-auto">
                          {jabbaInfo.versions.map((version) => (
                            <div
                              key={version}
                              className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <span className="font-mono text-sm">
                                {version}
                              </span>
                              {version === jabbaInfo.current ? (
                                <span className="text-xs text-green-600 font-semibold">
                                  {translations.javaManagement.active}
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSwitchVersion(version)}
                                  disabled={switching}
                                >
                                  {translations.javaManagement.use}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
