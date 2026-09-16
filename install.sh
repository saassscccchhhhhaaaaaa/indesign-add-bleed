#!/bin/bash
# Verlinkt das Script in alle gefundenen InDesign-Scripts-Panel-Ordner.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)/Beschnitt_ergaenzen.jsx"
found=0
for d in "$HOME/Library/Preferences/Adobe InDesign"/*/*/Scripts/"Scripts Panel"; do
  [ -d "$d" ] || continue
  ln -sfn "$SRC" "$d/Beschnitt_ergaenzen.jsx"
  echo "Installiert: $d"
  found=1
done
[ "$found" = 1 ] || echo "Kein Scripts-Panel-Ordner gefunden. InDesign starten und Fenster > Hilfsprogramme > Skripte einmal öffnen."
