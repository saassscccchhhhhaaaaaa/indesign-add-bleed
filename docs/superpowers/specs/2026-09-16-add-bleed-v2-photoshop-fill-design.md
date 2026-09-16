# Add Bleed – version 2: Fill via Photoshop

> Written for version 2.0, when the script was still called `Beschnitt_ergaenzen.jsx` and
> created `*_beschnitt.psd` files with a layer "Beschnitt". Since 2.1.0 these are
> `AddBleed.jsx`, `*_bleed.psd` and "Bleed"; the texts are German or English.

Builds on version 1 (`2026-09-16-add-bleed-design.md`). Everything from v1 still applies.

## Goal
Third method **"Fill (Photoshop)"**: the missing image in the bleed is added in Photoshop,
either **content-aware** (default) or **generative**, saved as a new PSD and relinked in
InDesign.

## Decisions
- New file: next to the original, named `<base>_beschnitt.psd`; if it exists,
  `<base>_beschnitt-2.psd`, `-3` … Never overwrite. The original file is never saved.
- Format: PSD with layers.
- Generative without a prompt (empty prompt), no text field.
- PDF/AI files are rasterised at 300 ppi.
- The script stays a single file; the Photoshop part is sent as source code via BridgeTalk.

## Dialog
- Radio buttons: Scale / Mirror / Fill (Photoshop).
- With "Fill": sub-choice content-aware (default) / generative; only enabled when
  "Fill" is selected.
- Notes: "PDF/AI files are rasterised (300 ppi)." and, for generative, "Needs internet
  and uses generative credits. Relies on an undocumented Photoshop function."
- Progress window (palette) for the Fill method: "Frame i of n – <file name>".

## Flow per frame (InDesign)
1. `BE.resolveFrame` as in v1. Additionally for Fill (`BE.checkFillable`):
   - Allowed graphic types: `Image` and `PDF` (InDesign places AI files as `PDF`). Otherwise "file type not supported for Fill".
   - `itemLink` present, status `LinkStatus.NORMAL`, otherwise "link missing or out of date".
   - Graphic not rotated/sheared and not flipped, otherwise "graphic rotated or flipped inside the frame".
2. Target as in v1 (`computeTarget`); no edge → reason as in v1.
3. `BE.fillNeed(gb, tb, marginPt)` → shares `{top,left,bottom,right}` relative to the
   graphic height/width; per side `max(0, missing)`, and if > 0 plus `marginPt`
   (1 mm). All 0 → only `BE.setFrameBounds(frame, tb)` (no Photoshop).
4. Photoshop job (see below) with source file, target path, shares, mode, PDF page and
   PDF crop. Returns the original pixel size and the pixels actually added per side.
5. `link.relink(newFile)`; new graphic bounds:
   `pxPt_x = gbWidth / origWidthPx`, `pxPt_y = gbHeight / origHeightPx`,
   `[gb0 − addTop·pxPt_y, gb1 − addLeft·pxPt_x, gb2 + addBottom·pxPt_y, gb3 + addRight·pxPt_x]`.
   Then `BE.setFrameBounds(frame, tb)`.
6. Error/timeout → frame skipped with reason; the others continue.

## Photoshop part (`BE.psJob`, runs in Photoshop)
Parameters (JSON-like object as source code): `src`, `dst`, `need{top,left,bottom,right}`,
`mode` ("contentAware"|"generative"), `pdfPage`, `pdfCrop`.
1. Save settings (dialogs off, ruler in pixels), restore in `finally`.
2. Open: image files normally; PDF/AI with `PDFOpenOptions` (300 ppi, default colour mode,
   page `pdfPage`, `cropPage` matching `pdfCrop`, anti-aliasing on).
3. `flatten()`, convert the background into a normal layer and name it "Original".
4. Pixels to add per side: `ceil(share × width or height)`; extend the canvas
   (first left/top with anchor bottom right, then right/bottom with anchor top left).
5. Overlap `ov = min(40, max(8, round(0.01 × min(width, height))))`.
   Selection = whole canvas minus inner rectangle (original area, shrunk by `ov` on the
   extended sides).
6. Content-aware mode: duplicate layer "Original" → "Beschnitt", fill the selection
   (`Fl  ` with `contentAware`), invert the selection, clear the layer content there.
   Generative mode: `syntheticFill` as in the feasibility test (empty prompt, `clio`).
   Photoshop names the new layer "Generative Fill".
7. Save as PSD (`dst`), close the document without saving.
8. Return a string `"ok|origW|origH|addTop|addLeft|addBottom|addRight"` or
   `"error|<message>"`.

## BridgeTalk (InDesign side)
- Target: highest installed non-beta Photoshop version
  (filter `BridgeTalk.getTargets`, exclude beta specifiers); none → stop with a
  message before processing.
- Launch Photoshop if it isn't running (`BridgeTalk.launch`), wait until ready.
- Synchronous waiting: `onResult`/`onError` set variables, loop with
  `BridgeTalk.pump()` + `$.sleep(100)`; timeout 60 s (content-aware) / 180 s (generative).

## Undo
InDesign changes = one undo step (as in v1). Created PSD files remain;
the summary states how many and where: "x new PSD files created next to the originals".

## To check during implementation
- Generative fill on CMYK: if not possible → reason "generative only for RGB images", no colour conversion.
- Reliably exclude the Photoshop (Beta) BridgeTalk specifier.
- `relink` from PDF to PSD and positioning.

## Tests
- Pure functions: `fillNeed`, `nextFreeName`, `psSelectionRects`/overlap, result parser.
- Photoshop part directly via `osascript … do javascript` (content-aware only): size, layers,
  file exists, original unchanged.
- InDesign flow with real Photoshop (content-aware): image and PDF, relinking,
  original pixels in their old position, frame = target, image already big enough → no Photoshop.
- Generative: one manual run after approval by the user (credits).
