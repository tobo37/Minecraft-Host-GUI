import { useState, useEffect } from "react";
import { type Language, getTranslations, type Translations } from "@/lib/i18n";

const LANGUAGE_KEY = "minecraft-server-manager-language";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    // Versuche gespeicherte Sprache zu laden, sonst Deutsch als Standard
    const saved = localStorage.getItem(LANGUAGE_KEY) as Language;
    return saved && ["de", "en"].includes(saved) ? saved : "de";
  });

  const [translations, setTranslations] = useState<Translations>(() => getTranslations(language));

  useEffect(() => {
    setTranslations(getTranslations(language));
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "de" ? "en" : "de"));
  };

  return {
    language,
    translations,
    setLanguage,
    toggleLanguage,
  };
}
