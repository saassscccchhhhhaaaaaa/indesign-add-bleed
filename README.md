# Beschnitt ergänzen (InDesign-Script)

Version 2.0.0 | Autor: Sascha Fronczek | [saschafronczek.de](https://saschafronczek.de) | Lizenz: [MIT](LICENSE) | kostenlos

Ergänzt bei ausgewählten Bildrahmen (Bild, PDF, AI …) Beschnitt an den Kanten,
die am Seitenrand liegen (Toleranz 1 mm). Der Bund bei Doppelseiten bleibt frei.
Die Beschnittwerte kommen aus den Dokumenteinstellungen.

## Methoden

- **Skalieren:** Der Rahmen wird in den Beschnitt erweitert. Reicht das Bild nicht,
  wird es proportional um die Rahmenmitte so wenig wie nötig vergrößert.
- **Spiegeln:** Gespiegelte Kopien als Streifen (und Ecken) im Beschnitt,
  gruppiert mit dem unveränderten Original. Vektoren bleiben Vektoren.
- **Füllen (Photoshop):** Fehlendes Bild wird in Photoshop ergänzt – *inhaltsbasiert*
  (lokal, kostenlos) oder *generativ* (**experimentell**: Internet, verbraucht
  generative Credits, nutzt eine nicht offiziell dokumentierte Photoshop-Funktion,
  die mit einem Update wegfallen kann). Ergebnis: `Name_beschnitt.psd` mit Ebenen
  neben dem Original, der Rahmen wird darauf neu verknüpft; die Originaldatei
  bleibt unverändert. PDF/AI werden dabei mit 300 ppi gerastert. Reicht das Bild
  schon, wird nur der Rahmen erweitert.

Alles lässt sich in InDesign mit einem Schritt rückgängig machen (erzeugte
PSD-Dateien bleiben auf der Festplatte).

## Voraussetzungen

- Adobe InDesign 2026 (entwickelt und getestet unter macOS, deutsche Oberfläche).
  InDesign 2025 und Windows sollten funktionieren, sind aber noch nicht getestet –
  Rückmeldungen willkommen.
- Für „Füllen“: Adobe Photoshop 2026 (getestet mit 27.10).

## Installation

1. Unter [Releases](../../releases) die Datei **`Beschnitt_ergaenzen.jsx`** herunterladen.
2. In InDesign **Fenster > Hilfsprogramme > Skripte** öffnen, Rechtsklick auf
   **Benutzer** > **Im Finder anzeigen** (Windows: **Im Explorer anzeigen**).
3. Die Datei in den geöffneten Ordner **Scripts Panel** legen.
4. Im Skripte-Bedienfeld erscheint sie unter **Benutzer**.

Tipp: Unter **Bearbeiten > Tastaturbefehle** (Bereich „Skripte“) lässt sich ein Kürzel vergeben.

Für Entwickler auf dem Mac: `./install.sh` verlinkt die Datei aus dem geklonten
Repository direkt in alle gefundenen Skripte-Ordner.

## Benutzung

Einen oder mehrere Bildrahmen auswählen, Script per Doppelklick starten, Methode
wählen. Am Ende zeigt eine Zusammenfassung, was bearbeitet und was übersprungen wurde.

**Nicht unterstützt** (wird übersprungen und genannt): gedrehte/verzerrte oder nicht
rechteckige Rahmen, Rahmen in Gruppen oder verankert, gesperrte Rahmen. Für „Füllen“
außerdem fehlende/geänderte Verknüpfungen und im Rahmen gedrehte oder gespiegelte Grafiken.

## Fehler melden und Ideen

Bitte über [Issues](../../issues/new/choose) – mit InDesign-/Photoshop-Version,
Betriebssystem und dem Text der Zusammenfassung. Das Script ist kostenlos und wird
in der Freizeit gepflegt; Antworten können etwas dauern.

## Entwicklung

```bash
test/run_tests.sh
```

Steuert InDesign 2026 per AppleScript (und Photoshop 2026 über BridgeTalk) und
arbeitet nur mit eigenen, unsichtbaren Testdokumenten. Getestet wird nur das
inhaltsbasierte Füllen – das generative verbraucht Credits und wird von Hand geprüft.
Während die Tests auf Photoshop warten, reagiert InDesign nicht.

Texte mit Umlauten im Code als `\uXXXX` schreiben – ExtendScript liest sie sonst
falsch (der Test-Runner prüft das). Hintergrund zu Aufbau und Entscheidungen:
[`docs/superpowers/`](docs/superpowers/).

## Lizenz

[MIT](LICENSE) © 2026 Sascha Fronczek – Nutzung auf eigene Verantwortung, ohne Gewähr.
Adobe, InDesign und Photoshop sind Marken von Adobe Inc.; dieses Projekt steht in
keiner Verbindung zu Adobe.
