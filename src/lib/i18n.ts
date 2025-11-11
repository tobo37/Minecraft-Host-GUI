export type Language = "de" | "en";

export interface Translations {
  title: string;
  description: string;
  features: {
    title: string;
    items: string[];
  };
  startButton: string;
  projectSelection: {
    title: string;
    description: string;
    createNew: string;
    selectProject: string;
    noProjects: string;
    status: {
      running: string;
      stopped: string;
    };
    createdLabel: string;
    sourceLabel: string;
    pathLabel: string;
  };
  serverManagement: {
    title: string;
    backToProjects: string;
    serverInfo: string;
    customName: string;
    description: string;
    renameButton: string;
    editDescriptionButton: string;
    deleteButton: string;
    renameDialog: {
      title: string;
      currentName: string;
      newNameLabel: string;
      cancel: string;
      save: string;
      validationError: string;
    };
    deleteDialog: {
      title: string;
      warning: string;
      confirmLabel: string;
      confirmPlaceholder: string;
      serverInfo: string;
      cancel: string;
      delete: string;
      validationError: string;
    };
  };
  messages: {
    serverCreating: string;
    serverError: string;
    serverExists: string;
  };
  javaManagement: {
    title: string;
    back: string;
    currentJava: string;
    version: string;
    path: string;
    noJava: string;
    jabbaTitle: string;
    jabbaDescription: string;
    installJabba: string;
    installing: string;
    jabbaInstalled: string;
    currentVersion: string;
    availableVersions: string;
    active: string;
    use: string;
    noVersionsInstalled: string;
    recommendedVersions: string;
    install: string;
    refresh: string;
    installNote: string;
  };
}

export const translations: Record<Language, Translations> = {
  de: {
    title: "Minecraft Server Manager",
    description:
      "Erstelle und verwalte deinen eigenen Minecraft Server mit nur einem Klick. Unser System kümmert sich um die komplette Einrichtung und Konfiguration.",
    features: {
      title: "Mit unserem Service kannst du:",
      items: [
        "Einen Minecraft Server in Sekunden erstellen",
        "Automatische Konfiguration und Setup",
        "Einfache Verwaltung über das Web-Interface",
      ],
    },
    startButton: "Jetzt starten",
    projectSelection: {
      title: "Wählen Sie Ihr Projekt",
      description:
        "Sie haben bereits Server-Projekte. Wählen Sie eines aus oder erstellen Sie ein neues.",
      createNew: "Neuen Server erstellen",
      selectProject: "Projekt auswählen",
      noProjects: "Keine Projekte gefunden",
      status: {
        running: "Läuft",
        stopped: "Gestoppt",
      },
      createdLabel: "Erstellt",
      sourceLabel: "Quelle",
      pathLabel: "Pfad",
    },
    serverManagement: {
      title: "Server Verwaltung",
      backToProjects: "Zurück zu Projekten",
      serverInfo: "Server Informationen",
      customName: "Servername",
      description: "Beschreibung",
      renameButton: "Umbenennen",
      editDescriptionButton: "Beschreibung bearbeiten",
      deleteButton: "Server löschen",
      renameDialog: {
        title: "Server umbenennen",
        currentName: "Aktueller Name",
        newNameLabel: "Neuer Name",
        cancel: "Abbrechen",
        save: "Speichern",
        validationError:
          "Der Name darf nicht leer sein und muss gültige Zeichen enthalten",
      },
      deleteDialog: {
        title: "Server löschen",
        warning:
          "⚠️ Warnung: Diese Aktion kann nicht rückgängig gemacht werden!",
        confirmLabel: "Geben Sie den Servernamen ein, um zu bestätigen:",
        confirmPlaceholder: "Servernamen eingeben",
        serverInfo: "Sie sind dabei zu löschen:",
        cancel: "Abbrechen",
        delete: "Löschen",
        validationError: "Der eingegebene Name stimmt nicht überein",
      },
    },
    messages: {
      serverCreating: "Server erfolgreich erstellt!",
      serverError: "Fehler beim Erstellen des Servers",
      serverExists: "Server bereits vorhanden",
    },
    javaManagement: {
      title: "Java Verwaltung",
      back: "Zurück",
      currentJava: "Aktuelle Java Installation",
      version: "Version",
      path: "Pfad",
      noJava: "Java ist nicht installiert",
      jabbaTitle: "Jabba - Java Version Manager",
      jabbaDescription: "Jabba ermöglicht es Ihnen, mehrere Java-Versionen zu installieren und einfach zwischen ihnen zu wechseln.",
      installJabba: "Jabba installieren",
      installing: "Installiere...",
      jabbaInstalled: "Jabba ist installiert",
      currentVersion: "Aktuelle Version",
      availableVersions: "Installierte Versionen",
      active: "Aktiv",
      use: "Verwenden",
      noVersionsInstalled: "Keine Java-Versionen installiert. Installieren Sie eine Version, um zu beginnen.",
      recommendedVersions: "Empfohlene Versionen:",
      install: "Installieren",
      refresh: "Aktualisieren",
      installNote: "Nach der Installation wird Jabba direkt verwendet. Klicken Sie auf 'Aktualisieren', wenn die Versionen nicht angezeigt werden.",
    },
  },
  en: {
    title: "Minecraft Server Manager",
    description:
      "Create and manage your own Minecraft server with just one click. Our system takes care of the complete setup and configuration.",
    features: {
      title: "With our service you can:",
      items: [
        "Create a Minecraft server in seconds",
        "Automatic configuration and setup",
        "Easy management via web interface",
      ],
    },
    startButton: "Get Started",
    projectSelection: {
      title: "Choose Your Project",
      description:
        "You already have server projects. Choose one or create a new one.",
      createNew: "Create New Server",
      selectProject: "Select Project",
      noProjects: "No projects found",
      status: {
        running: "Running",
        stopped: "Stopped",
      },
      createdLabel: "Created",
      sourceLabel: "Source",
      pathLabel: "Path",
    },
    serverManagement: {
      title: "Server Management",
      backToProjects: "Back to Projects",
      serverInfo: "Server Information",
      customName: "Server Name",
      description: "Description",
      renameButton: "Rename",
      editDescriptionButton: "Edit Description",
      deleteButton: "Delete Server",
      renameDialog: {
        title: "Rename Server",
        currentName: "Current Name",
        newNameLabel: "New Name",
        cancel: "Cancel",
        save: "Save",
        validationError:
          "Name cannot be empty and must contain valid characters",
      },
      deleteDialog: {
        title: "Delete Server",
        warning: "⚠️ Warning: This action cannot be undone!",
        confirmLabel: "Type the server name to confirm:",
        confirmPlaceholder: "Enter server name",
        serverInfo: "You are about to delete:",
        cancel: "Cancel",
        delete: "Delete",
        validationError: "The entered name does not match",
      },
    },
    messages: {
      serverCreating: "Server created successfully!",
      serverError: "Error creating server",
      serverExists: "Server already exists",
    },
    javaManagement: {
      title: "Java Management",
      back: "Back",
      currentJava: "Current Java Installation",
      version: "Version",
      path: "Path",
      noJava: "Java is not installed",
      jabbaTitle: "Jabba - Java Version Manager",
      jabbaDescription: "Jabba allows you to install multiple Java versions and easily switch between them.",
      installJabba: "Install Jabba",
      installing: "Installing...",
      jabbaInstalled: "Jabba is installed",
      currentVersion: "Current Version",
      availableVersions: "Installed Versions",
      active: "Active",
      use: "Use",
      noVersionsInstalled: "No Java versions installed. Install a version to get started.",
      recommendedVersions: "Recommended versions:",
      install: "Install",
      refresh: "Refresh",
      installNote: "After installation, Jabba will be used directly. Click 'Refresh' if versions don't appear.",
    },
  },
};

export const getTranslations = (language: Language): Translations => {
  return translations[language];
};
