import { useState, useCallback } from "react";

export function useJabbaInstall(onSuccess: () => void) {
  const [installing, setInstalling] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installJabba = useCallback(async () => {
    setInstalling(true);
    setError(null);
    try {
      const response = await fetch("/api/java/jabba/install", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        onSuccess();
      } else {
        setError(data.error || "Failed to install Jabba");
      }
    } catch (err) {
      setError("Failed to install Jabba");
      console.error(err);
    } finally {
      setInstalling(false);
    }
  }, [onSuccess]);

  const switchVersion = useCallback(
    async (version: string) => {
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
          onSuccess();
        } else {
          setError(data.error || "Failed to switch Java version");
        }
      } catch (err) {
        setError("Failed to switch Java version");
        console.error(err);
      } finally {
        setSwitching(false);
      }
    },
    [onSuccess]
  );

  const installVersion = useCallback(
    async (version: string) => {
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
          // If version was already installed, switch to it directly
          if (data.alreadyInstalled) {
            // Switch to the version
            await switchVersion(version);
          } else {
            onSuccess();
          }
        } else {
          setError(data.error || "Failed to install Java version");
        }
      } catch (err) {
        setError("Failed to install Java version");
        console.error(err);
      } finally {
        setInstalling(false);
      }
    },
    [onSuccess, switchVersion]
  );

  return {
    installing,
    switching,
    error,
    installJabba,
    installVersion,
    switchVersion,
  };
}
