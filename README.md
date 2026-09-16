# Beschnitt ergänzen (InDesign-Script)

Ergänzt bei ausgewählten Bildrahmen (Bild, PDF, AI …) Beschnitt an den Kanten,
die am Seitenrand liegen (Toleranz 1 mm). Der Bund bei Doppelseiten bleibt frei.
Die Beschnittwerte kommen aus den Dokumenteinstellungen.

## Methoden

- **Skalieren:** Der Rahmen wird in den Beschnitt erweitert. Reicht das Bild nicht,
  wird es proportional um die Rahmenmitte so wenig wie nötig vergrößert.
- **Spiegeln:** Gespiegelte Kopien als Streifen (und Ecken) im Beschnitt,
  gruppiert mit dem unveränderten Original. Vektoren bleiben Vektoren.

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

Steuert InDesign 2026 per AppleScript und arbeitet nur mit eigenen, unsichtbaren
Testdokumenten. Texte mit Umlauten im Code als `\uXXXX` schreiben – ExtendScript
liest sie sonst falsch (der Test-Runner prüft das).

Geplant (Version 2): Beschnitt über Photoshop füllen (inhaltsbasiert / generativ).
