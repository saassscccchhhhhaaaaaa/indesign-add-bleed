#!/bin/bash
# Startet die Tests in InDesign und gibt das Ergebnis aus.
DIR="$(cd "$(dirname "$0")" && pwd)"
# ExtendScript liest Umlaute in Strings nicht zuverlässig: dort nur \uXXXX-Escapes verwenden
if perl -ne 'if (/"[^"]*[^\x00-\x7F][^"]*"/) { print "$ARGV:$.: $_"; $bad = 1 } close ARGV if eof; END { exit !$bad }' "$DIR/../Beschnitt_ergaenzen.jsx" "$DIR"/*.jsx; then
  echo "Nicht-ASCII-Zeichen in Strings (siehe oben) - bitte als \\uXXXX schreiben"; exit 1
fi
mkdir -p "$DIR/output"
rm -f "$DIR/output/result.txt"
osascript -e 'with timeout of 600 seconds' \
  -e "tell application \"Adobe InDesign 2026\" to do script (POSIX file \"$DIR/run_tests.jsx\") language javascript" \
  -e 'end timeout' >/dev/null || exit 1
[ -f "$DIR/output/result.txt" ] || { echo "Keine Ergebnisdatei"; exit 1; }
cat "$DIR/output/result.txt"
grep -q "ERGEBNIS: [0-9]* ok, 0 fehlgeschlagen" "$DIR/output/result.txt"
