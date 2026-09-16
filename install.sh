#!/bin/bash
# Symlinks the script into every InDesign Scripts Panel folder found (macOS).
set -e
SRC="$(cd "$(dirname "$0")" && pwd)/AddBleed.jsx"
found=0
for d in "$HOME/Library/Preferences/Adobe InDesign"/*/*/Scripts/"Scripts Panel"; do
  [ -d "$d" ] || continue
  # remove the link to the old file name (before version 2.1.0)
  if [ -L "$d/Beschnitt_ergaenzen.jsx" ]; then rm "$d/Beschnitt_ergaenzen.jsx"; fi
  ln -sfn "$SRC" "$d/AddBleed.jsx"
  echo "Installed: $d"
  found=1
done
[ "$found" = 1 ] || echo "No Scripts Panel folder found. Start InDesign and open Window > Utilities > Scripts once."
