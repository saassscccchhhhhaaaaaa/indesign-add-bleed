# Changelog

## 2.2.1 – 2026-09-17
- Dialog: more space between the panel titles ("Method", "Document bleed") and their options.

## 2.2.0 – 2026-09-17
- The script is now **English by default**, regardless of the InDesign language.
- New language selection (English / Deutsch) at the bottom of the dialog; the texts
  switch immediately and the choice is remembered for the next run.

## 2.1.1 – 2026-09-16
- Fix: with **Mirror**, the mirrored strips got a 1 pt black stroke when the
  original frame had no stroke colour. They now never get a stroke.

## 2.1.0 – 2026-09-16
- Script renamed from `Beschnitt_ergaenzen.jsx` to **`AddBleed.jsx`**.
  If you installed the old file, delete it from your Scripts Panel folder.
- The dialogs are now English, or German when InDesign runs in German.
- Filled images are saved as `Name_bleed.psd` (before: `Name_beschnitt.psd`);
  the fill layer is called "Bleed".
- Documentation, issue templates and code comments in English.

## 2.0.0 – 2026-09-16
- New method **Fill (Photoshop)**: content-aware or generative (experimental).
- Progress window while Photoshop is working.

## 1.0.0 – 2026-09-16
- Methods **Scale** and **Mirror**, automatic edge detection, spine left alone,
  single undo step.
