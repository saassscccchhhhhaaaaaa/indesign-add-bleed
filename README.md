# Beschnitt ergänzen (InDesign-Script)

Version 2.0.0 | Autor: Sascha Fronczek | [saschafronczek.de](https://saschafronczek.de)

Ergänzt bei ausgewählten Bildrahmen (Bild, PDF, AI …) Beschnitt an den Kanten,
die am Seitenrand liegen (Toleranz 1 mm). Der Bund bei Doppelseiten bleibt frei.
Die Beschnittwerte kommen aus den Dokumenteinstellungen.

## Methoden

- **Skalieren:** Der Rahmen wird in den Beschnitt erweitert. Reicht das Bild nicht,
  wird es proportional um die Rahmenmitte so wenig wie nötig vergrößert.
- **Spiegeln:** Gespiegelte Kopien als Streifen (und Ecken) im Beschnitt,
  gruppiert mit dem unveränderten Original. Vektoren bleiben Vektoren.
- **Füllen (Photoshop):** Fehlendes Bild wird in Photoshop ergänzt – *inhaltsbasiert*
  (lokal, kostenlos) oder *generativ* (Internet, verbraucht generative Credits,
  nicht offiziell dokumentierte Photoshop-Funktion). Ergebnis: `Name_beschnitt.psd`
  mit Ebenen neben dem Original, der Rahmen wird darauf neu verknüpft; die
  Originaldatei bleibt unverändert. PDF/AI werden dabei mit 300 ppi gerastert.
  Die PSD-Dateien bleiben beim Rückgängigmachen erhalten. Reicht das Bild schon,
  wird nur der Rahmen erweitert.

Alles lässt sich mit einem Schritt rückgängig machen.

## Installation

```bash
./install.sh
```

Danach in InDesign: **Fenster > Hilfsprogramme > Skripte > Benutzer > Beschnitt_ergaenzen.jsx**
(Doppelklick; Tipp: unter Bearbeiten > Tastaturbefehle lässt sich ein Kürzel vergeben).

## Nicht unterstützt

Gedrehte/verzerrte oder nicht rechteckige Rahmen, Rahmen in Gruppen oder verankert,
gesperrte Rahmen. Diese werden übersprungen und in der Zusammenfassung genannt.

## Entwicklung

```bash
test/run_tests.sh
```

Steuert InDesign 2026 per AppleScript (und Photoshop 2026 über BridgeTalk) und
arbeitet nur mit eigenen, unsichtbaren Testdokumenten. Getestet wird nur das
inhaltsbasierte Füllen – das generative verbraucht Credits und wird von Hand geprüft.
Während die Tests auf Photoshop warten, reagiert InDesign nicht.

Texte mit Umlauten im Code als `\uXXXX` schreiben – ExtendScript liest sie sonst
falsch (der Test-Runner prüft das).
