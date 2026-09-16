# Beschnitt_ergaenzen.jsx – Design (Version 1)

## Ziel
InDesign-Script, das bei ausgewählten Bildrahmen (Bild, PDF, AI …) Beschnitt an den
Kanten ergänzt, die am Seitenrand liegen. Zwei Methoden: **Skalieren** und **Spiegeln**.
Füllen über Photoshop (inhaltsbasiert/generativ) ist Version 2 und nicht Teil dieses Designs.

## Rahmenbedingungen
- ExtendScript (`.jsx`), eine einzige Datei, lauffähig in InDesign 2025 und 2026.
- Quelle: `Bleed_Area/Beschnitt_ergaenzen.jsx`; Nutzung über Alias im Scripts-Panel-Ordner
  `~/Library/Preferences/Adobe InDesign/Version 21.0/de_DE/Scripts/Scripts Panel/`.
- Gesamter Durchlauf als ein Undo-Schritt (`app.doScript(..., UndoModes.ENTIRE_SCRIPT)`).
- Intern Maßeinheit Punkt; Original-Maßeinheiten und Linealursprung werden in `finally` wiederhergestellt.

## Ablauf
1. **Auswahl prüfen**
   - Kein Dokument / keine Auswahl → Meldung, Abbruch.
   - Akzeptiert: rechteckige Rahmen (Rectangle, oder Polygon mit 4 rechtwinkligen Punkten),
     die genau eine Grafik enthalten. Ist die Grafik selbst ausgewählt, wird ihr Elternrahmen verwendet.
   - Übersprungen (mit Grund): leere Rahmen, Textrahmen, Gruppen, Rahmen mit Drehung
     oder Scherung ≠ 0, alle anderen Formen (Ovale, Polygone mit ≠ 4 Punkten, mehrere Pfade).
   - Keine gültigen Rahmen → Meldung, Abbruch.
2. **Dialog (ScriptUI)**: Radiobuttons „Skalieren“ (Vorauswahl) / „Spiegeln“; Anzeige der
   Beschnittwerte des Dokuments in mm; OK / Abbrechen.
3. **Beschnitt auslesen** aus `documentPreferences`:
   `documentBleedTopOffset`, `documentBleedBottomOffset`,
   `documentBleedInsideOrLeftOffset`, `documentBleedOutsideOrRightOffset`.
   Alle vier = 0 → Meldung, Abbruch.
   Zuordnung links/rechts pro Rahmen über `parentPage.side`:
   - `RIGHT_HAND` oder `SINGLE_SIDED`: links = inside, rechts = outside.
   - `LEFT_HAND`: links = outside, rechts = inside.
   Bei Rahmen über zwei Seiten gilt: linke Kante nach der Seite, auf der sie liegt, rechte
   Kante ebenso. (Innen-Kanten werden ohnehin durch Schritt 4 ausgeschlossen.)
4. **Kanten erkennen** (Toleranz 1 mm = 2,835 pt, `geometricBounds`):
   - oben: |Rahmen.oben − Seite.oben| ≤ Toleranz
   - unten: |Rahmen.unten − Seite.unten| ≤ Toleranz
   - links: |Rahmen.links − Druckbogen.links| ≤ Toleranz
   - rechts: |Rahmen.rechts − Druckbogen.rechts| ≤ Toleranz
   „Seite“ = Seite, auf der die jeweilige Kante liegt; „Druckbogen“ = äußere Grenzen aller
   Seiten des Druckbogens. Damit bekommt der Bund nie Beschnitt.
   Eine Kante mit Beschnittwert 0 zählt nicht als erkannt.
   Keine Kante erkannt → Rahmen übersprungen („liegt nicht am Seitenrand“).
5. **Beschnitt ergänzen** (siehe Methoden). Zielgrenzen: Kanten werden auf
   Seiten-/Druckbogenrand + Beschnitt gesetzt (nicht Rahmenkante + Beschnitt), damit
   Rahmen innerhalb der Toleranz sauber an der Beschnittkante landen.
6. **Zusammenfassung**: Anzahl bearbeitet / übersprungen, jeweils mit Grund.

## Methode „Skalieren“
- Zielrahmen T = Rahmen, an den erkannten Kanten auf Beschnittkante erweitert.
- Grafikgrenzen G (`graphic.geometricBounds`). Deckt G das Rechteck T komplett ab →
  nur Rahmen auf T setzen, Grafik bleibt unverändert.
- Sonst Faktor s (≥ 1) um die Mitte C des ursprünglichen Rahmens berechnen, sodass die
  skalierte Grafik T abdeckt; pro Seite z. B. oben: s ≥ (C.y − T.oben) / (C.y − G.oben),
  entsprechend für unten/links/rechts; s = Maximum. Grafik mit s um C skalieren
  (proportional), danach Rahmen auf T setzen.

## Methode „Spiegeln“
- Für jede erkannte Kante: Rahmen duplizieren, Duplikat an der Kantenlinie spiegeln
  (links/rechts horizontal, oben/unten vertikal), Duplikat-Rahmen auf den Streifen
  zwischen Kante und Beschnittkante zuschneiden (Grafik bleibt dabei an ihrer Position).
- Für jedes Paar benachbarter erkannter Kanten (oben-links, oben-rechts, unten-links,
  unten-rechts): Duplikat in beide Richtungen spiegeln, auf das Eckquadrat zuschneiden.
- Streifen/Ecken: Kontur entfernen (`strokeWeight = 0`), Textumfluss aus.
- Original und alle Streifen/Ecken gruppieren. Original bleibt unverändert.

## Fehlerbehandlung
- Fehler bei einem Rahmen → Rahmen übersprungen, Fehlertext in Zusammenfassung,
  übrige Rahmen werden weiter bearbeitet.
- Einstellungen werden immer wiederhergestellt.

## Test
Automatisiert per AppleScript (`do script … language javascript`) gegen InDesign 2026:
Testdokument erzeugen (einseitig und doppelseitig, Beschnitt gleich und unterschiedlich,
Rahmen an Rand / Bund / innen / über Doppelseite, Grafik mit und ohne Überstand),
Script-Logik ausführen, resultierende Bounds gegen erwartete Werte prüfen.
Manuelle Sichtkontrolle mit echtem Bild und PDF durch den Nutzer.
