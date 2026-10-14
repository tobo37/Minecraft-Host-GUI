import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { WelcomePage } from "@/components/WelcomePage";
import { ProjectSelection } from "@/features/projects";
import { ServerManagement } from "@/components/ServerManagement";
import { NotFoundPage } from "@/components/NotFoundPage";
import { Link } from "@/components/ui/link";
import { useState, useEffect } from "react";
import { navigate, routes, useRoute } from "@/lib/router";
import "./index.css";

export function App() {
  const { language, toggleLanguage, translations } = useLanguage();
  const route = useRoute();
  // Only the start page decides between project list and onboarding; deep links render directly.
  const [checkingServers, setCheckingServers] = useState(route.name === "projects");

  useEffect(() => {
    if (checkingServers) {
      checkExistingServers();
    }
  }, []);

  const checkExistingServers = async () => {
    try {
      const response = await fetch("/api/servers");
      const data = await response.json();

      if (!data.servers || data.servers.length === 0) {
        navigate(routes.create(), { replace: true });
      }
    } catch (error) {
      console.error("Error checking servers:", error);
      navigate(routes.create(), { replace: true });
    } finally {
      setCheckingServers(false);
    }
  };

  if (checkingServers) {
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
        <Link href={routes.projects()} className="app-brand">
          <span className="grass-block" aria-hidden="true" />
          <span>
            MINECRAFT HOST<small>SERVER CONTROL CENTER</small>
          </span>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          aria-label={translations.common.languageToggleLabel}
          className="font-mono text-xs"
        >
          {language.toUpperCase()}
        </Button>
      </header>

      {route.name === "create" && (
        <WelcomePage onServerCreated={(serverPath) => navigate(routes.server(serverPath))} />
      )}

      {route.name === "projects" && <ProjectSelection />}

      {route.name === "server" && (
        <ServerManagement key={route.serverId} projectPath={route.serverId} view={route.view} />
      )}

      {route.name === "notFound" && <NotFoundPage />}
    </div>
  );
}

export default App;
