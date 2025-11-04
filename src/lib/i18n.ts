export type Language = 'de' | 'en';

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
  };
  serverManagement: {
    title: string;
    backToProjects: string;
    serverInfo: string;
  };
  messages: {
    serverCreating: string;
    serverError: string;
    serverExists: string;
  };
}

export const translations: Record<Language, Translations> = {
  de: {
    title: 'Minecraft Server Manager',
    description: 'Erstelle und verwalte deinen eigenen Minecraft Server mit nur einem Klick. Unser System kümmert sich um die komplette Einrichtung und Konfiguration.',
    features: {
      title: 'Mit unserem Service kannst du:',
      items: [
        'Einen Minecraft Server in Sekunden erstellen',
        'Automatische Konfiguration und Setup',
        'Einfache Verwaltung über das Web-Interface'
      ]
    },
    startButton: 'Jetzt starten',
    projectSelection: {
      title: 'Wählen Sie Ihr Projekt',
      description: 'Sie haben bereits Server-Projekte. Wählen Sie eines aus oder erstellen Sie ein neues.',
      createNew: 'Neuen Server erstellen',
      selectProject: 'Projekt auswählen',
      noProjects: 'Keine Projekte gefunden'
    },
    serverManagement: {
      title: 'Server Verwaltung',
      backToProjects: 'Zurück zu Projekten',
      serverInfo: 'Server Informationen'
    },
    messages: {
      serverCreating: 'Server erfolgreich erstellt!',
      serverError: 'Fehler beim Erstellen des Servers',
      serverExists: 'Server bereits vorhanden'
    }
  },
  en: {
    title: 'Minecraft Server Manager',
    description: 'Create and manage your own Minecraft server with just one click. Our system takes care of the complete setup and configuration.',
    features: {
      title: 'With our service you can:',
      items: [
        'Create a Minecraft server in seconds',
        'Automatic configuration and setup',
        'Easy management via web interface'
      ]
    },
    startButton: 'Get Started',
    projectSelection: {
      title: 'Choose Your Project',
      description: 'You already have server projects. Choose one or create a new one.',
      createNew: 'Create New Server',
      selectProject: 'Select Project',
      noProjects: 'No projects found'
    },
    serverManagement: {
      title: 'Server Management',
      backToProjects: 'Back to Projects',
      serverInfo: 'Server Information'
    },
    messages: {
      serverCreating: 'Server created successfully!',
      serverError: 'Error creating server',
      serverExists: 'Server already exists'
    }
  }
};

export const getTranslations = (language: Language): Translations => {
  return translations[language];
};