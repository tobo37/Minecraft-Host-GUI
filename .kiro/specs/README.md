# Refactoring Specs - Übersicht

## Quick Start

1. **Spec lesen:** `.kiro/specs/clean-code-refactoring.md`
2. **Patterns lernen:** `.kiro/specs/refactoring-patterns.md`
3. **Phase 1 starten:** Letzter Fehler beheben (5 Min)
4. **Phase 2 beginnen:** Services refactoren (größter Impact)

## Aktueller Status

```
✅ 98% Fehlerreduktion (43 → 1)
🟡 173 Probleme gesamt
🎯 Ziel: <20 Probleme
⏱️ Geschätzt: 6-8 Stunden
```

## Prioritäten

### 🔴 Hoch (Sofort)
- [ ] Phase 1: Letzter Fehler (5 Min)
- [ ] Phase 2: Services aufteilen (2-3 Std)

### 🟡 Mittel (Diese Woche)
- [ ] Phase 3: Komponenten refactoren (1-2 Std)
- [ ] Phase 6: Logger einbauen (30 Min)

### 🟢 Niedrig (Später)
- [ ] Phase 7-10: Feinschliff (2 Std)

## Nächste Schritte

```bash
# 1. Status prüfen
bun lint

# 2. Ersten Task starten
# Öffne: src/services/javaService.ts:219
# Ändere: } catch {} → } catch (_error) { /* Ignore */ }

# 3. Verifizieren
bun lint  # Sollte 0 Fehler zeigen

# 4. Commit
git add .
git commit -m "fix: empty catch block in javaService"

# 5. Weiter mit Phase 2
```

## Hilfreiche Dateien

- **Spec:** `.kiro/specs/clean-code-refactoring.md` - Alle Tasks
- **Patterns:** `.kiro/specs/refactoring-patterns.md` - Code-Beispiele
- **Steering:** `.kiro/steering/clean-code.md` - Prinzipien
- **Guide:** `docs/CODE-QUALITY.md` - Entwickler-Dokumentation
- **Status:** `LINTING-FINAL-STATUS.md` - Aktueller Stand

## Vorbild

Das **WelcomePage Refactoring** (`src/features/welcome/`) zeigt alle Patterns:
- ✅ Feature-basierte Struktur
- ✅ Kleine, fokussierte Komponenten
- ✅ Custom Hooks für Logik
- ✅ Separation of Concerns
- ✅ Alle Funktionen <50 Zeilen

## Fragen?

Siehe:
- Clean Code Prinzipien: `.kiro/steering/clean-code.md`
- Refactoring Patterns: `.kiro/specs/refactoring-patterns.md`
- Code Quality Guide: `docs/CODE-QUALITY.md`

## Fortschritt tracken

Nach jedem Task:
```bash
# Linting prüfen
bun lint | findstr "problems"

# In Spec abhaken
# [ ] → [x]

# Commit
git commit -m "refactor: <was wurde gemacht>"
```

## Erfolg messen

| Metrik | Start | Aktuell | Ziel |
|--------|-------|---------|------|
| Fehler | 43 | 1 | 0 |
| Warnungen | 162 | 172 | <20 |
| Dateien >300 | 4 | 3 | 0 |
| Funktionen >50 | ~40 | ~38 | <10 |

## Zeitplan (Vorschlag)

**Tag 1 (2-3 Std):**
- Phase 1: Fehler beheben
- Phase 2.1: serverService.ts aufteilen

**Tag 2 (2-3 Std):**
- Phase 2.2: serverFileService.ts aufteilen
- Phase 6: Logger einbauen

**Tag 3 (2-3 Std):**
- Phase 3: Komponenten refactoren
- Phase 7-10: Feinschliff

## Tipps

💡 **Klein anfangen** - Eine Datei nach der anderen
💡 **Tests laufen lassen** - Nach jeder Änderung
💡 **WelcomePage als Vorbild** - Zeigt alle Patterns
💡 **Regelmäßig committen** - Nach jedem Task
💡 **Nicht perfekt sein** - Besser ist besser als perfekt

## Support

Bei Fragen oder Problemen:
1. Patterns-Datei konsultieren
2. WelcomePage als Referenz nutzen
3. Clean Code Steering lesen
4. Im Team fragen

---

**Los geht's! 🚀**

Starte mit Phase 1 - nur 5 Minuten für einen schnellen Win!
