export type Language = 'de' | 'en';

export interface Translations {
  title: string;
  description: string;
  features: {
    title: string;
    items: string[];
  };
  startButton: string;
  messages: {
    serverCreating: string;
    serverError: string;
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
    messages: {
      serverCreating: 'Server wird erstellt...',
      serverError: 'Fehler beim Erstellen des Servers'
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
    messages: {
      serverCreating: 'Creating server...',
      serverError: 'Error creating server'
    }
  }
};

export const getTranslations = (language: Language): Translations => {
  return translations[language];
};