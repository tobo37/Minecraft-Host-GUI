import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { WelcomePage } from "@/components/WelcomePage";
import { ProjectSelection } from "@/features/projects";
import { ServerManagement } from "@/components/ServerManagement";
import { useState, useEffect } from "react";
import "./index.css";

type AppState = "loading" | "welcome" | "projects" | "server";

export function App() {
  const { language, toggleLanguage } = useLanguage();
  const [appState, setAppState] = useState<AppState>("loading");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    checkExistingServers();
  }, []);

  const checkExistingServers = async () => {
    try {
      const response = await fetch("/api/servers");
      const data = await response.json();

      if (data.servers && data.servers.length > 0) {
        setAppState("projects");
      } else {
        setAppState("welcome");
      }
    } catch (error) {
      console.error("Error checking servers:", error);
      setAppState("welcome");
    }
  };

  const handleServerCreated = (serverPath: string) => {
    setSelectedProject(serverPath);
    setAppState("server");
  };

  const handleSelectProject = (projectPath: string) => {
    setSelectedProject(projectPath);
    setAppState("server");
  };

  const handleCreateNew = () => {
    setAppState("welcome");
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setAppState("projects");
  };

  if (appState === "loading") {
    return (
      <div className="app-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Persistent navigation stays in document flow to avoid covering page controls. */}
      <header className="app-header">
        <div className="app-brand">
          <span className="grass-block" aria-hidden="true" />
          <span>
            MINECRAFT HOST<small>SERVER CONTROL CENTER</small>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          aria-label={language === "de" ? "Switch to English" : "Auf Deutsch wechseln"}
          className="font-mono text-xs"
        >
          {language.toUpperCase()}
        </Button>
      </header>

      {appState === "welcome" && <WelcomePage onServerCreated={handleServerCreated} />}

      {appState === "projects" && (
        <ProjectSelection onSelectProject={handleSelectProject} onCreateNew={handleCreateNew} />
      )}

      {appState === "server" && selectedProject && (
        <ServerManagement projectPath={selectedProject} onBack={handleBackToProjects} />
      )}
    </div>
  );
}

export default App;
