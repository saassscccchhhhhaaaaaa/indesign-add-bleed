# Changelog

## 2.3.0 – 2026-10-26
- **Generative fill works again** on Photoshop 27.11.0 and 28.0.1. On Photoshop 27.10
  and older, use version 2.2.1 instead – the parameters are not interchangeable. Photoshop 27.11 changed the parameters of the
  undocumented command: `workflowType`, `serviceVersion`, a `gemini` block and a
  service map were added, `gi_ADVANCED` was dropped and `documentID`/`layerID` became
  `DocI`/`LyrI`. The descriptor was read from a recorded Photoshop action.
- If a future update changes it again, the frame is still skipped with a clear message.

## 2.2.3 – 2026-10-26
- Clearer wording for the generative-fill failure: it no longer blames the Photoshop
  version, because Photoshop rejects the request on 27.11.0 and 28.0.1 alike.

## 2.2.2 – 2026-10-26
- Generative fill no longer shows a raw Photoshop error. Adobe changed the
  undocumented command in **Photoshop 28.0.1**, so the frame is now skipped with a
  clear message pointing to content-aware fill.
- Content-aware fill, scale and mirror are unaffected.

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
