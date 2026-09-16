# Beschnitt_ergaenzen.jsx – Version 2: Füllen über Photoshop

Baut auf Version 1 auf (`2026-09-16-beschnitt-ergaenzen-design.md`). Alles aus v1 gilt weiter.

## Ziel
Dritte Methode **„Füllen (Photoshop)“**: fehlendes Bild im Beschnitt wird in Photoshop
**inhaltsbasiert** (Standard) oder **generativ** ergänzt, als neue PSD gespeichert und in
InDesign neu verknüpft.

## Festlegungen
- Neue Datei: neben dem Original, Name `<Basis>_beschnitt.psd`; existiert sie, dann
  `<Basis>_beschnitt-2.psd`, `-3` … Nie überschreiben. Originaldatei wird nie gespeichert.
- Format: PSD mit Ebenen.
- Generativ ohne Prompt (leerer Prompt), kein Textfeld.
- PDF/AI werden mit 300 ppi gerastert.
- Script bleibt eine Datei; der Photoshop-Teil wird als Quelltext per BridgeTalk gesendet.

## Dialog
- Radiobuttons: Skalieren / Spiegeln / Füllen (Photoshop).
- Bei „Füllen“: Unterauswahl inhaltsbasiert (Vorauswahl) / generativ; nur aktiv, wenn
  „Füllen“ gewählt ist.
- Hinweistexte: „PDF/AI werden in Pixel umgewandelt (300 ppi).“ und bei generativ
  „Braucht Internet und verbraucht generative Credits. Nutzt eine nicht offiziell
  dokumentierte Photoshop-Funktion.“
- Fortschrittsfenster (Palette) bei Methode Füllen: „Rahmen i von n – <Dateiname>“.

## Ablauf pro Rahmen (InDesign)
1. `BE.resolveFrame` wie v1. Zusätzlich für Füllen (`BE.checkFillable`):
   - Erlaubte Grafiktypen: `Image` und `PDF` (AI wird in InDesign als `PDF` platziert). Sonst „Dateityp wird für Füllen nicht unterstützt“.
   - `itemLink` vorhanden, Status `LinkStatus.NORMAL`, sonst „Verknüpfung fehlt oder ist nicht aktuell“.
   - Grafik ohne Drehung/Scherung und nicht gespiegelt, sonst „Grafik im Rahmen gedreht oder gespiegelt“.
2. Ziel wie v1 (`computeTarget`); keine Kante → Grund wie v1.
3. `BE.fillNeed(gb, tb, marginPt)` → Anteile `{top,left,bottom,right}` bezogen auf
   Grafikhöhe bzw. -breite; pro Seite `max(0, fehlend)`, und wenn > 0, plus `marginPt`
   (1 mm). Alle 0 → nur `BE.setFrameBounds(frame, tb)` (kein Photoshop).
4. Photoshop-Auftrag (siehe unten) mit Quelldatei, Zielpfad, Anteilen, Modus, PDF-Seite und
   PDF-Beschnittart. Rückgabe: Original-Pixelmaß und tatsächlich angefügte Pixel je Seite.
5. `link.relink(neueDatei)`; neue Grafik-Bounds:
   `pxPt_x = gbBreite / origBreitePx`, `pxPt_y = gbHöhe / origHöhePx`,
   `[gb0 − addTop·pxPt_y, gb1 − addLeft·pxPt_x, gb2 + addBottom·pxPt_y, gb3 + addRight·pxPt_x]`.
   Danach `BE.setFrameBounds(frame, tb)`.
6. Fehler/Timeout → Rahmen übersprungen mit Grund; übrige laufen weiter.

## Photoshop-Teil (`BE.psJob`, läuft in Photoshop)
Parameter (JSON-artiges Objekt als Quelltext): `src`, `dst`, `need{top,left,bottom,right}`,
`mode` ("contentAware"|"generative"), `pdfPage`, `pdfCrop`.
1. Einstellungen sichern (Dialoge aus, Lineal Pixel), in `finally` zurück.
2. Öffnen: Bilddatei normal; PDF/AI mit `PDFOpenOptions` (300 ppi, Farbmodus Standard,
   Seite `pdfPage`, `cropPage` passend zu `pdfCrop`, Kantenglättung an).
3. `flatten()`, Hintergrund in normale Ebene umwandeln und „Original“ nennen.
4. Pixel zu ergänzen je Seite: `ceil(anteil × Breite bzw. Höhe)`; Arbeitsfläche erweitern
   (erst links/oben mit Anker unten rechts, dann rechts/unten mit Anker oben links).
5. Überlappung `ov = min(40, max(8, round(0.01 × min(Breite, Höhe))))`.
   Auswahl = ganze Fläche minus Innenrechteck (Originalbereich, an ergänzten Seiten um
   `ov` verkleinert).
6. Modus inhaltsbasiert: Ebene „Original“ duplizieren → „Beschnitt“, Auswahl füllen
   (`Fl  ` mit `contentAware`), Auswahl umkehren, Inhalt der Ebene löschen.
   Modus generativ: `syntheticFill` wie im Machbarkeitstest (leerer Prompt, `clio`).
   Neue Ebene nennt Photoshop „Generatives Füllen“.
7. Als PSD speichern (`dst`), Dokument schließen ohne Speichern.
8. Rückgabe als String `"ok|origW|origH|addTop|addLeft|addBottom|addRight"` oder
   `"error|<Meldung>"`.

## BridgeTalk (InDesign-Seite)
- Ziel: höchste installierte, nicht-Beta Photoshop-Version
  (`BridgeTalk.getTargets` filtern, Beta-Specifier ausschließen); keine → Abbruch mit
  Meldung vor der Bearbeitung.
- Photoshop starten, falls nicht aktiv (`BridgeTalk.launch`), warten bis bereit.
- Synchrones Warten: `onResult`/`onError` setzen Variablen, Schleife mit
  `BridgeTalk.pump()` + `$.sleep(100)`; Timeout 60 s (inhaltsbasiert) / 180 s (generativ).

## Rückgängig
InDesign-Änderungen = ein Undo-Schritt (wie v1). Erzeugte PSD-Dateien bleiben;
Zusammenfassung nennt Anzahl und Ort: „x neue PSD-Dateien neben den Originalen angelegt“.

## Zu prüfen bei der Umsetzung
- Generative Füllung bei CMYK: falls nicht möglich → Grund „generativ nur für RGB-Bilder“, keine Farbumwandlung.
- BridgeTalk-Specifier von Photoshop (Beta) sicher ausschließen.
- `relink` von PDF auf PSD und Positionierung.

## Tests
- Reine Funktionen: `fillNeed`, `nextFreeName`, `psSelectionRects`/Überlappung, Rückgabe-Parser.
- Photoshop-Teil direkt per `osascript … do javascript` (nur inhaltsbasiert): Maße, Ebenen,
  Datei vorhanden, Original unverändert.
- InDesign-Ablauf mit echtem Photoshop (inhaltsbasiert): Bild und PDF, Neuverknüpfung,
  Originalpixel an alter Position, Rahmen = Ziel, Bild reicht schon → kein Photoshop.
- Generativ: ein manueller Durchlauf nach Freigabe durch den Nutzer (Credits).
