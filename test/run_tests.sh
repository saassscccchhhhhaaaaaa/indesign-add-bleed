#!/bin/bash
# Startet die Tests in InDesign und gibt das Ergebnis aus.
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$DIR/output"
rm -f "$DIR/output/result.txt"
osascript -e 'with timeout of 600 seconds' \
  -e "tell application \"Adobe InDesign 2026\" to do script (POSIX file \"$DIR/run_tests.jsx\") language javascript" \
  -e 'end timeout' >/dev/null || exit 1
[ -f "$DIR/output/result.txt" ] || { echo "Keine Ergebnisdatei"; exit 1; }
cat "$DIR/output/result.txt"
grep -q "ERGEBNIS: [0-9]* ok, 0 fehlgeschlagen" "$DIR/output/result.txt"
